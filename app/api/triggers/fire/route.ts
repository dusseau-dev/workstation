import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { runWorkflow } from "@/lib/workflow-runner";

type TriggerConfig = {
  fromColumnId?: string;
  toColumnId?: string;
  columnId?: string;
  watchedField?: string;
};

type FireRequestBody = {
  boardId: string;
  eventType: "CARD_CREATED" | "CARD_MOVED" | "CARD_UPDATED";
  cardId: string;
  cardData: Record<string, unknown>;
  fromColumnId?: string;
  toColumnId?: string;
  changedFields?: string[];
};

/**
 * POST /api/triggers/fire
 *
 * Called by board mutations (card create/move/update) to fire matching
 * workflow triggers. Runs matched workflows in parallel (fire-and-forget
 * from the caller's perspective — this endpoint awaits completion).
 */
export async function POST(request: NextRequest) {
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;
  const { userId, organizationId } = authResult.session;

  let body: FireRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { boardId, eventType, cardId, cardData, fromColumnId, toColumnId, changedFields } = body;

  if (!boardId || !eventType || !cardId) {
    return NextResponse.json(
      { error: "boardId, eventType, and cardId are required" },
      { status: 400 }
    );
  }

  const VALID_EVENT_TYPES = ["CARD_CREATED", "CARD_MOVED", "CARD_UPDATED"] as const;
  if (!VALID_EVENT_TYPES.includes(eventType as (typeof VALID_EVENT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid eventType: ${eventType}` },
      { status: 400 }
    );
  }

  // Find enabled triggers for this board + event type
  const triggers = await prisma.workflowTrigger.findMany({
    where: {
      boardId,
      organizationId,
      triggerType: eventType,
      enabled: true,
    },
    include: {
      workflow: { select: { id: true, status: true } },
    },
  });

  // Filter triggers by their config
  const matchingTriggers = triggers.filter((trigger) => {
    const cfg = (trigger.configJson ?? {}) as TriggerConfig;
    const workflow = trigger.workflow;

    // Skip archived workflows
    if (workflow.status !== "ACTIVE") return false;

    switch (eventType) {
      case "CARD_MOVED": {
        if (cfg.fromColumnId && cfg.fromColumnId !== fromColumnId) return false;
        if (cfg.toColumnId && cfg.toColumnId !== toColumnId) return false;
        return true;
      }
      case "CARD_CREATED": {
        if (cfg.columnId && cfg.columnId !== cardData.columnId) return false;
        return true;
      }
      case "CARD_UPDATED": {
        if (cfg.watchedField && changedFields && !changedFields.includes(cfg.watchedField)) {
          return false;
        }
        return true;
      }
      default:
        return false;
    }
  });

  if (matchingTriggers.length === 0) {
    return NextResponse.json({ fired: [] });
  }

  // Build input from card data
  const input: Record<string, unknown> = {
    ...cardData,
    cardId,
    boardId,
    eventType,
    ...(fromColumnId ? { fromColumnId } : {}),
    ...(toColumnId ? { toColumnId } : {}),
    ...(changedFields ? { changedFields } : {}),
  };

  // Run all matching workflows in parallel
  const results = await Promise.allSettled(
    matchingTriggers.map((trigger) =>
      runWorkflow({
        workflowId: trigger.workflowId,
        organizationId,
        userId,
        inputJson: input,
        boardId,
        cardId,
        triggerId: trigger.id,
      })
    )
  );

  const fired = results.map((r, i) => ({
    triggerId: matchingTriggers[i].id,
    workflowId: matchingTriggers[i].workflowId,
    ...(r.status === "fulfilled"
      ? { executionId: r.value.executionId, status: r.value.status }
      : { error: r.reason instanceof Error ? r.reason.message : String(r.reason) }),
  }));

  return NextResponse.json({ fired });
}
