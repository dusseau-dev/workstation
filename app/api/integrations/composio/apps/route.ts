import { NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";

export async function GET() {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  try {
    const composio = getComposioClient();
    const toolkits = await composio.toolkits.get();
    return NextResponse.json(toolkits);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list apps" },
      { status: 500 }
    );
  }
}
