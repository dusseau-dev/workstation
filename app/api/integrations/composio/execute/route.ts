import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";

export async function POST(request: NextRequest) {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  const body = await request.json();
  const { toolName, arguments: args } = body as {
    toolName: string;
    arguments: Record<string, unknown>;
  };

  if (!toolName) {
    return NextResponse.json(
      { error: "toolName is required" },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();
    const execResult = await composio.tools.execute(toolName, {
      userId: result.session.userId,
      arguments: args ?? {},
    });
    return NextResponse.json(execResult);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to execute tool" },
      { status: 500 }
    );
  }
}
