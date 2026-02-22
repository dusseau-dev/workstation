import { NextRequest, NextResponse } from "next/server";
import { getSessionOrError } from "@/lib/api-auth";
import { getComposioClient } from "@/lib/composio";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const result = await getSessionOrError();
  if (result.error) return result.error;

  const body = await request.json();
  const { appName, authConfigId, callbackUrl } = body as {
    appName?: string;
    authConfigId?: string;
    callbackUrl?: string;
  };

  if (!appName && !authConfigId) {
    return NextResponse.json(
      { error: "appName or authConfigId is required" },
      { status: 400 }
    );
  }

  try {
    const composio = getComposioClient();
    const resolvedCallbackUrl =
      callbackUrl ?? `${process.env.BETTER_AUTH_URL}/workflows`;

    // Resolve auth config ID from app name if needed
    let resolvedAuthConfigId = authConfigId;
    if (!resolvedAuthConfigId && appName) {
      const configs = await composio.authConfigs.list({ toolkit: appName });
      const first = configs.items[0];
      if (!first) {
        return NextResponse.json(
          { error: `No auth config found for app: ${appName}` },
          { status: 400 }
        );
      }
      resolvedAuthConfigId = first.id;
    }

    const connectionRequest = await composio.connectedAccounts.initiate(
      result.session.userId,
      resolvedAuthConfigId!,
      { callbackUrl: resolvedCallbackUrl }
    );

    // Upsert entity mapping in our DB
    const resolvedAppName = appName ?? authConfigId!;
    await prisma.composioConnection.upsert({
      where: {
        organizationId_userId_appName: {
          organizationId: result.session.organizationId,
          userId: result.session.userId,
          appName: resolvedAppName,
        },
      },
      create: {
        organizationId: result.session.organizationId,
        userId: result.session.userId,
        appName: resolvedAppName,
        composioEntityId: connectionRequest.id,
        status: "CONNECTED",
      },
      update: {
        composioEntityId: connectionRequest.id,
        status: "CONNECTED",
      },
    });

    return NextResponse.json({
      id: connectionRequest.id,
      redirectUrl: connectionRequest.redirectUrl ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to initiate connection",
      },
      { status: 500 }
    );
  }
}
