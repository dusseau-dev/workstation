import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  const body = await request.json();
  const { appName } = body as { appName?: string };

  if (!appName) {
    return NextResponse.json(
      { error: "appName is required" },
      { status: 400 }
    );
  }

  try {
    // Find the connection record in our DB
    const connection = await prisma.composioConnection.findUnique({
      where: {
        organizationId_userId_appName: {
          organizationId: result.session.organizationId,
          userId: result.session.userId,
          appName,
        },
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Try to delete from Composio
    try {
      const composio = getComposioClient();
      await composio.connectedAccounts.delete(connection.composioEntityId);
    } catch {
      // Composio deletion may fail if already removed — continue to update DB
    }

    // Mark as disconnected in our DB (preserve history)
    await prisma.composioConnection.update({
      where: { id: connection.id },
      data: { status: "DISCONNECTED" },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to disconnect",
      },
      { status: 500 }
    );
  }
}
