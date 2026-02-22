import { NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";

export async function GET() {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  try {
    const composio = getComposioClient();
    const accounts = await composio.connectedAccounts.list({
      userIds: [result.session.userId],
    });
    return NextResponse.json(accounts);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list connections" },
      { status: 500 }
    );
  }
}
