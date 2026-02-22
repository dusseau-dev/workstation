import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { executeNode } from "@/lib/workflow-executor";
import type { WorkflowNodeData } from "@/lib/workflow-store";

export async function POST(request: NextRequest) {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  const body = await request.json();
  const { nodeData, stepOutputs } = body as {
    nodeId: string;
    nodeData: WorkflowNodeData;
    stepOutputs?: Record<string, unknown>;
  };

  if (!nodeData) {
    return NextResponse.json({ error: "nodeData is required" }, { status: 400 });
  }

  const execResult = await executeNode(
    nodeData,
    result.session.userId,
    result.session.organizationId,
    stepOutputs
  );

  return NextResponse.json(execResult);
}
