import { NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { runWorkflow } from "@/lib/workflow-runner";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: workflowId } = await params;
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;
  const { userId, organizationId } = authResult.session;

  // Parse optional input from request body
  let inputJson: Record<string, unknown> = {};
  try {
    const body = await request.json();
    inputJson = body.input ?? {};
  } catch {
    // No body is fine for manual runs
  }

  const result = await runWorkflow({
    workflowId,
    organizationId,
    userId,
    inputJson,
  });

  if (!result.success && !result.executionId) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
