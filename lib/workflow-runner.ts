import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { executeNode, type ExecuteNodeResult } from "@/lib/workflow-executor";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-store";

/** Cast plain objects to Prisma JSON type */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Topological sort using Kahn's algorithm. Returns null if graph has a cycle. */
function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const neighbor of adjacency.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length < nodes.length) return null;
  return sorted;
}

/** Get all downstream node IDs from a given node */
function getDownstream(
  nodeId: string,
  edges: WorkflowEdge[],
  allNodeIds: Set<string>
): Set<string> {
  const downstream = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (
        edge.source === current &&
        allNodeIds.has(edge.target) &&
        !downstream.has(edge.target)
      ) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return downstream;
}

type RunWorkflowParams = {
  workflowId: string;
  organizationId: string;
  userId: string;
  inputJson?: Record<string, unknown>;
  boardId?: string;
  cardId?: string;
  triggerId?: string;
};

type RunWorkflowResult = {
  success: boolean;
  executionId: string;
  status: string;
  error?: string | null;
};

/**
 * Execute a workflow: create execution record, run nodes in topological order,
 * log per-step results.
 */
export async function runWorkflow(
  params: RunWorkflowParams
): Promise<RunWorkflowResult> {
  "use workflow";

  const {
    workflowId,
    organizationId,
    userId,
    inputJson = {},
    boardId,
    cardId,
    triggerId,
  } = params;

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
  if (!workflow) {
    return { success: false, executionId: "", status: "FAILED", error: "Workflow not found" };
  }
  if (workflow.status === "ARCHIVED") {
    return { success: false, executionId: "", status: "FAILED", error: "Cannot run an archived workflow" };
  }

  const nodes = (workflow.nodesJson as unknown as WorkflowNode[]) ?? [];
  const edges = (workflow.edgesJson as unknown as WorkflowEdge[]) ?? [];

  if (nodes.length === 0) {
    return { success: false, executionId: "", status: "FAILED", error: "Workflow has no nodes" };
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      organizationId,
      triggeredByUserId: userId,
      boardId: boardId ?? null,
      cardId: cardId ?? null,
      triggerId: triggerId ?? null,
      status: "RUNNING",
      inputJson: toJson(inputJson),
      startedAt: new Date(),
    },
  });

  const sortedNodes = topologicalSort(nodes, edges);
  if (!sortedNodes) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "FAILED",
        error: "Workflow contains a cycle",
        completedAt: new Date(),
      },
    });
    return {
      success: false,
      executionId: execution.id,
      status: "FAILED",
      error: "Workflow contains a cycle",
    };
  }

  const stepOutputs: Record<string, unknown> = {};
  // Inject trigger input as a pseudo-step so nodes can reference {{steps.trigger.output.field}}
  stepOutputs["trigger"] = inputJson;

  const skippedNodes = new Set<string>();
  let overallStatus: "COMPLETED" | "FAILED" = "COMPLETED";
  let overallError: string | null = null;

  for (const node of sortedNodes) {
    const incomingEdges = edges.filter((e) => e.target === node.id);
    if (
      incomingEdges.length > 0 &&
      incomingEdges.every((e) => skippedNodes.has(e.source))
    ) {
      skippedNodes.add(node.id);
      await prisma.workflowExecutionLog.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeName: node.data.label ?? node.id,
          status: "SKIPPED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      continue;
    }

    const branchEdges = incomingEdges.filter((e) => e.sourceHandle);
    const allBranchesInactive =
      branchEdges.length > 0 &&
      branchEdges.every((edge) => {
        const parentOutput = stepOutputs[edge.source] as
          | { branch?: string }
          | undefined;
        return (
          parentOutput?.branch !== undefined &&
          parentOutput.branch !== edge.sourceHandle
        );
      });

    if (allBranchesInactive) {
      skippedNodes.add(node.id);
      await prisma.workflowExecutionLog.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeName: node.data.label ?? node.id,
          status: "SKIPPED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      continue;
    }

    const logEntry = await prisma.workflowExecutionLog.create({
      data: {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.data.label ?? node.id,
        status: "RUNNING",
        inputJson: toJson(node.data.config ?? {}),
        startedAt: new Date(),
      },
    });

    let result: ExecuteNodeResult;
    async function runStep() {
      "use step";
      return await executeNode(
        node.data,
        userId,
        organizationId,
        stepOutputs
      );
    }
    try {
      result = await runStep();
    } catch (err) {
      result = {
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      };
    }

    stepOutputs[node.id] = result.output;
    if (node.data.label) {
      stepOutputs[node.data.label.replace(/\s+/g, "_")] = result.output;
    }

    await prisma.workflowExecutionLog.update({
      where: { id: logEntry.id },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        outputJson: result.output != null ? toJson(result.output) : undefined,
        error: result.error ?? null,
        completedAt: new Date(),
      },
    });

    if (!result.success) {
      overallStatus = "FAILED";
      overallError = result.error ?? "Node execution failed";
      const downstream = getDownstream(
        node.id,
        edges,
        new Set(sortedNodes.map((n) => n.id))
      );
      for (const downId of downstream) skippedNodes.add(downId);
    }
  }

  await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: overallStatus,
      error: overallError,
      outputJson: toJson(stepOutputs),
      completedAt: new Date(),
    },
  });

  return {
    success: overallStatus === "COMPLETED",
    executionId: execution.id,
    status: overallStatus,
    error: overallError,
  };
}
