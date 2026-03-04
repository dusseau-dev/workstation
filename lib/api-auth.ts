import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export type SessionInfo = {
  userId: string;
  organizationId: string;
};

export async function getSessionOrError(): Promise<
  | { session: SessionInfo; error?: undefined }
  | { session?: undefined; error: NextResponse }
> {
  const reqHeaders = await headers();
  const sessionResult = await auth.api.getSession({ headers: reqHeaders });

  if (!sessionResult) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { session } = sessionResult;
  if (!session.activeOrganizationId) {
    return {
      error: NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      ),
    };
  }

  return {
    session: {
      userId: session.userId,
      organizationId: session.activeOrganizationId,
    },
  };
}
