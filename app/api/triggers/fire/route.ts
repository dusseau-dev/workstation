import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { triggerWorkflow, type TriggerEvent } from "@/lib/actions/trigger-workflow";

type FireRequestBody = {
  boardId: string;
  eventType: "CARD_CREATED" | "CARD_MOVED" | "CARD_UPDATED";
  cardId: string;
  cardData: Record<string, unknown>;
  fromColumnId?: string;
  toColumnId?: string;
  changedFields?: string[];
};

const VALID_EVENT_TYPES = ["CARD_CREATED", "CARD_MOVED", "CARD_UPDATED"] as const;

/**
 * POST /api/triggers/fire
 *
 * HTTP entrypoint for firing workflow triggers. Delegates to the
 * triggerWorkflow server action for the actual matching + dispatch.
 * Kept for backward compatibility (external callers, webhooks).
 */
export async function POST(request: NextRequest) {
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;

  let body: FireRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { boardId, eventType, cardId } = body;
  if (!boardId || !eventType || !cardId) {
    return NextResponse.json(
      { error: "boardId, eventType, and cardId are required" },
      { status: 400 }
    );
  }
  if (!VALID_EVENT_TYPES.includes(eventType as (typeof VALID_EVENT_TYPES)[number])) {
    return NextResponse.json(
      { error: `Invalid eventType: ${eventType}` },
      { status: 400 }
    );
  }

  const fired = await triggerWorkflow(body as TriggerEvent);
  return NextResponse.json({ fired });
}
