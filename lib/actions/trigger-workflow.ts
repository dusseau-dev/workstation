"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runWorkflow } from "@/lib/workflow-runner";
import { headers } from "next/headers";

export type TriggerEvent = {
  boardId: string;
  eventType: "CARD_CREATED" | "CARD_MOVED" | "CARD_UPDATED";
  cardId: string;
  cardData: Record<string, unknown>;
  fromColumnId?: string;
  toColumnId?: string;
  changedFields?: string[];
};

export type TriggerFireResult = {
  triggerId: string;
  workflowId: string;
  executionId?: string;
  status?: string;
  error?: string;
};

type TriggerConfig = {
  fromColumnId?: string;
  toColumnId?: string;
  columnId?: string;
  watchedField?: string;
};

/**
 * Server action that fires matching workflow triggers for a board event.
 * Called by board mutation components after card create/move/update succeeds.
 */
export async function triggerWorkflow(
  event: TriggerEvent
): Promise<TriggerFireResult[]> {
  // Authenticate
  const reqHeaders = await headers();
  const sessionResult = await auth.api.getSession({ headers: reqHeaders });
  if (!sessionResult || !sessionResult.session.activeOrganizationId) {
    return [];
  }

  const userId = sessionResult.session.userId;
  const organizationId = sessionResult.session.activeOrganizationId;

  const {
    boardId,
    eventType,
    cardId,
    cardData,
    fromColumnId,
    toColumnId,
    changedFields,
  } = event;

  if (!boardId || !eventType || !cardId) {
    return [];
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
    if (trigger.workflow.status !== "ACTIVE") return false;

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
        if (
          cfg.watchedField &&
          changedFields &&
          !changedFields.includes(cfg.watchedField)
        ) {
          return false;
        }
        return true;
      }
      default:
        return false;
    }
  });

  if (matchingTriggers.length === 0) return [];

  // Build input from card data + event metadata
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

  return results.map((r, i) => ({
    triggerId: matchingTriggers[i].id,
    workflowId: matchingTriggers[i].workflowId,
    ...(r.status === "fulfilled"
      ? { executionId: r.value.executionId, status: r.value.status }
      : {
          error:
            r.reason instanceof Error ? r.reason.message : String(r.reason),
        }),
  }));
}
