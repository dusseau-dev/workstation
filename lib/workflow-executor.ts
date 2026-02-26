import { getComposioClient } from "@/lib/composio";
import { prisma } from "@/lib/prisma";
import type { WorkflowNodeData } from "@/lib/workflow-store";

export type ExecuteNodeResult = {
  success: boolean;
  output?: unknown;
  error?: string;
  needsConnection?: {
    appName: string;
    connectUrl: string;
  };
};

// Maps built-in node subtypes to Composio app + action
const SUBTYPE_TO_COMPOSIO: Record<string, { app: string; action: string }> = {
  send_email: { app: "gmail", action: "GMAIL_SEND_EMAIL" },
  send_slack: { app: "slack", action: "SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL" },
  http_request: { app: "http", action: "HTTP_REQUEST" },
};

// Resolve template variables like {{steps.NodeName.output}} or {{steps.NodeName.output.field}}
function resolveVariables(
  value: unknown,
  stepOutputs: Record<string, unknown>
): unknown {
  if (typeof value !== "string") return value;
  return value.replace(/\{\{steps\.([^.]+)\.output(?:\.([^}]+))?\}\}/g, (_match, nodeName, nestedPath) => {
    let output = stepOutputs[nodeName];
    // Traverse nested path (e.g., "cardId" or "data.id")
    if (nestedPath && output != null && typeof output === "object") {
      for (const key of nestedPath.split(".")) {
        output = (output as Record<string, unknown>)[key];
        if (output == null) break;
      }
    }
    return typeof output === "string" ? output : JSON.stringify(output ?? "");
  });
}

function resolveConfig(
  config: Record<string, unknown>,
  stepOutputs: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    resolved[key] = resolveVariables(value, stepOutputs);
  }
  return resolved;
}

async function checkConnection(
  userId: string,
  organizationId: string,
  appName: string
): Promise<{ connected: boolean; connectUrl?: string }> {
  const connection = await prisma.composioConnection.findFirst({
    where: { userId, organizationId, appName, status: "CONNECTED" },
  });
  if (connection) return { connected: true };

  // Also check Composio's connected accounts directly
  try {
    const composio = getComposioClient();
    const accounts = await composio.connectedAccounts.list({
      userIds: [userId],
    });
    const items = accounts?.items ?? [];
    const hasConnection = items.some(
      (a) => a.toolkit?.slug === appName && a.status === "ACTIVE"
    );
    if (hasConnection) return { connected: true };
  } catch {
    // Fall through
  }

  return {
    connected: false,
    connectUrl: `/api/integrations/composio/connect`,
  };
}

export async function executeNode(
  nodeData: WorkflowNodeData,
  userId: string,
  organizationId: string,
  stepOutputs?: Record<string, unknown>
): Promise<ExecuteNodeResult> {
  const config = resolveConfig(nodeData.config ?? {}, stepOutputs ?? {});
  const subtype = nodeData.subtype ?? "";

  // Composio action node (from IntegrationBrowser)
  if (subtype === "composio_action") {
    const composioApp = config.composioApp as string;
    const composioAction = config.composioAction as string;
    if (!composioApp || !composioAction) {
      return { success: false, error: "Missing composioApp or composioAction in config" };
    }
    return executeComposioAction(composioApp, composioAction, config, userId, organizationId);
  }

  // Local card operations — execute against the app's own database
  if (subtype === "create_card") {
    return executeCreateCard(config, organizationId);
  }
  if (subtype === "update_card") {
    return executeUpdateCard(config, organizationId);
  }

  // Built-in subtypes that map to Composio
  const mapping = SUBTYPE_TO_COMPOSIO[subtype];
  if (mapping) {
    return executeComposioAction(mapping.app, mapping.action, config, userId, organizationId);
  }

  // AI subtypes — not routed through Composio (need separate AI SDK)
  if (subtype.startsWith("ai_")) {
    return { success: true, output: { message: `AI action "${subtype}" execution placeholder` } };
  }

  // Logic subtypes — evaluated locally
  if (subtype === "if_else") {
    return executeCondition(config);
  }
  if (subtype === "loop") {
    const count = Math.min(Math.max(Number(config.count) || 1, 1), 100);
    return { success: true, output: { iterations: count, variable: config.variable ?? "item" } };
  }
  if (subtype === "delay") {
    const ms = ((config.duration as number) ?? 5) * getDelayMultiplier(config.unit as string);
    await new Promise((r) => setTimeout(r, Math.min(ms, 30000)));
    return { success: true, output: { delayed: ms } };
  }

  // Triggers don't execute
  if (nodeData.type === "trigger") {
    return { success: true, output: { triggered: true } };
  }

  return { success: false, error: `Unknown node subtype: ${subtype}` };
}

async function executeComposioAction(
  appName: string,
  actionName: string,
  params: Record<string, unknown>,
  userId: string,
  organizationId: string
): Promise<ExecuteNodeResult> {
  const connCheck = await checkConnection(userId, organizationId, appName);
  if (!connCheck.connected) {
    return {
      success: false,
      error: `Not connected to ${appName}. Please connect first.`,
      needsConnection: { appName, connectUrl: connCheck.connectUrl! },
    };
  }

  try {
    const composio = getComposioClient();
    // Filter out internal config keys before sending to Composio
    const actionParams = { ...params };
    delete actionParams.composioApp;
    delete actionParams.composioAction;
    const result = await composio.tools.execute(actionName, {
      userId,
      arguments: actionParams,
    });
    return { success: true, output: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Composio execution failed",
    };
  }
}

function executeCondition(config: Record<string, unknown>): ExecuteNodeResult {
  const field = String(config.condition ?? "");
  const operator = String(config.operator ?? "equals");
  const expected = String(config.value ?? "");

  let result = false;
  switch (operator) {
    case "equals": result = field === expected; break;
    case "not_equals": result = field !== expected; break;
    case "contains": result = field.includes(expected); break;
    case "gt": result = Number(field) > Number(expected); break;
    case "lt": result = Number(field) < Number(expected); break;
  }
  return { success: true, output: { result, branch: result ? "true" : "false" } };
}

function getDelayMultiplier(unit: string): number {
  switch (unit) {
    case "minutes": return 60_000;
    case "hours": return 3_600_000;
    default: return 1_000;
  }
}

/** Verify a column belongs to an org (via column → board → organizationId) */
async function verifyColumnOrg(columnId: string, organizationId: string): Promise<boolean> {
  const column = await prisma.column.findFirst({
    where: { id: columnId, board: { organizationId } },
    select: { id: true },
  });
  return !!column;
}

async function executeCreateCard(
  config: Record<string, unknown>,
  organizationId: string
): Promise<ExecuteNodeResult> {
  const columnId = String(config.columnId ?? "");
  const title = String(config.title ?? "");
  if (!columnId || !title) {
    return { success: false, error: "columnId and title are required to create a card" };
  }

  if (!(await verifyColumnOrg(columnId, organizationId))) {
    return { success: false, error: "Column not found or does not belong to this organization" };
  }

  try {
    const lastTask = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (lastTask?.order ?? -1) + 1;

    const priorityStr = String(config.priority ?? "MEDIUM").toUpperCase();
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
    const priority = validPriorities.includes(priorityStr as typeof validPriorities[number])
      ? (priorityStr as typeof validPriorities[number])
      : "MEDIUM";

    const task = await prisma.task.create({
      data: {
        title,
        description: config.description ? String(config.description) : null,
        columnId,
        order,
        priority,
        assigneeId: config.assigneeId ? String(config.assigneeId) : null,
      },
    });
    return { success: true, output: { cardId: task.id, title: task.title, columnId: task.columnId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create card" };
  }
}

async function executeUpdateCard(
  config: Record<string, unknown>,
  organizationId: string
): Promise<ExecuteNodeResult> {
  const cardId = String(config.cardId ?? "");
  if (!cardId) {
    return { success: false, error: "cardId is required to update a card" };
  }

  // Verify card belongs to org via task → column → board → organizationId
  const existingTask = await prisma.task.findFirst({
    where: { id: cardId, column: { board: { organizationId } } },
    select: { id: true },
  });
  if (!existingTask) {
    return { success: false, error: "Card not found or does not belong to this organization" };
  }

  try {
    const data: Record<string, unknown> = {};
    if (config.title) data.title = String(config.title);
    if (config.description) data.description = String(config.description);
    if (config.columnId) {
      const targetColumnId = String(config.columnId);
      if (!(await verifyColumnOrg(targetColumnId, organizationId))) {
        return { success: false, error: "Target column does not belong to this organization" };
      }
      data.columnId = targetColumnId;
    }
    if (config.assigneeId) data.assigneeId = String(config.assigneeId);
    if (config.priority) {
      const priorityStr = String(config.priority).toUpperCase();
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
      if (validPriorities.includes(priorityStr as typeof validPriorities[number])) {
        data.priority = priorityStr;
      }
    }

    if (Object.keys(data).length === 0) {
      return { success: true, output: { cardId, message: "No fields to update" } };
    }

    const task = await prisma.task.update({
      where: { id: cardId },
      data,
    });
    return { success: true, output: { cardId: task.id, title: task.title, columnId: task.columnId } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update card" };
  }
}
