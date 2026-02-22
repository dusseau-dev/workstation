import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrError } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id: workflowId } = await params;
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;
  const { organizationId } = authResult.session;

  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId, organizationId },
    include: {
      logs: { orderBy: { startedAt: "asc" } },
      triggeredByUser: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(executions);
}
