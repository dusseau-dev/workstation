import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ app: string }> }
) {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  const { app } = await params;

  try {
    const composio = getComposioClient();
    const tools = await composio.tools.get(result.session.userId, {
      toolkits: [app.toUpperCase()],
    });
    return NextResponse.json(tools);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list actions" },
      { status: 500 }
    );
  }
}
