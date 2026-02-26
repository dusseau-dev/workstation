import { NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { runWorkflow } from "@/lib/workflow-runner";

type Params = { params: Promise<{ id: string }> };
type RunBody = {
  input?: Record<string, unknown>;
  boardId?: string;
  cardId?: string;
  retryExecutionId?: string;
  retryFromNodeId?: string;
};

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export async function POST(request: Request, { params }: Params) {
  const { id: workflowId } = await params;
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;
  const { userId, organizationId } = authResult.session;

  let body: RunBody = {};
  try {
    body = (await request.json()) as RunBody;
  } catch {
    // No body is fine for manual runs
  }

  let inputJson = toObject(body.input);
  let boardId: string | undefined =
    typeof body.boardId === "string" ? body.boardId : undefined;
  let cardId: string | undefined =
    typeof body.cardId === "string" ? body.cardId : undefined;
  let triggerId: string | undefined;
  let prefilledStepOutputs: Record<string, unknown> | undefined;

  const retryExecutionId =
    typeof body.retryExecutionId === "string" ? body.retryExecutionId : undefined;
  const retryFromNodeId =
    typeof body.retryFromNodeId === "string" ? body.retryFromNodeId : undefined;

  if (retryFromNodeId) {
    if (!retryExecutionId) {
      return NextResponse.json(
        { error: "retryExecutionId is required when retryFromNodeId is provided" },
        { status: 400 }
      );
    }

    const baseExecution = await prisma.workflowExecution.findFirst({
      where: {
        id: retryExecutionId,
        workflowId,
        organizationId,
      },
      select: {
        id: true,
        inputJson: true,
        outputJson: true,
        boardId: true,
        cardId: true,
        triggerId: true,
      },
    });

    if (!baseExecution) {
      return NextResponse.json(
        { error: "Cannot retry: execution not found or access denied" },
        { status: 400 }
      );
    }

    const failedStep = await prisma.workflowExecutionLog.findFirst({
      where: {
        executionId: baseExecution.id,
        nodeId: retryFromNodeId,
        status: "FAILED",
      },
      select: { id: true },
    });

    if (!failedStep) {
      return NextResponse.json(
        { error: "Cannot retry: execution not found or access denied" },
        { status: 400 }
      );
    }

    inputJson = toObject(baseExecution.inputJson);
    prefilledStepOutputs = toObject(baseExecution.outputJson);
    boardId = baseExecution.boardId ?? undefined;
    cardId = baseExecution.cardId ?? undefined;
    triggerId = baseExecution.triggerId ?? undefined;
  }

  const result = await runWorkflow({
    workflowId,
    organizationId,
    userId,
    inputJson,
    boardId,
    cardId,
    triggerId,
    retryFromNodeId,
    prefilledStepOutputs,
  });

  if (!result.success && !result.executionId) {
    return NextResponse.json(
      { error: "Unable to run this workflow" },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
