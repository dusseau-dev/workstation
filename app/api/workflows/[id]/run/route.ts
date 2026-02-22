import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getSessionOrError } from "@/lib/api-auth";
import { executeNode, type ExecuteNodeResult } from "@/lib/workflow-executor";
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-store";

// Helper to cast plain objects to Prisma JSON type
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

type Params = { params: Promise<{ id: string }> };

// Topological sort using Kahn's algorithm. Returns null if the graph has a cycle.
function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] | null {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: WorkflowNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const neighbor of adjacency.get(id) ?? []) {
      const deg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, deg);
      if (deg === 0) queue.push(neighbor);
    }
  }

  // Cycle detection: if not all nodes were visited, there's a cycle
  if (sorted.length < nodes.length) return null;

  return sorted;
}

export async function POST(request: Request, { params }: Params) {
  const { id: workflowId } = await params;
  const authResult = await getSessionOrError();
  if (authResult.error) return authResult.error;
  const { userId, organizationId } = authResult.session;

  // Fetch workflow
  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, organizationId },
  });
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }
  if (workflow.status === "ARCHIVED") {
    return NextResponse.json({ error: "Cannot run an archived workflow" }, { status: 400 });
  }

  const nodes = (workflow.nodesJson as unknown as WorkflowNode[]) ?? [];
  const edges = (workflow.edgesJson as unknown as WorkflowEdge[]) ?? [];

  if (nodes.length === 0) {
    return NextResponse.json({ error: "Workflow has no nodes" }, { status: 400 });
  }

  // Parse optional input from request body
  let inputJson: Record<string, unknown> = {};
  try {
    const body = await request.json();
    inputJson = body.input ?? {};
  } catch {
    // No body is fine for manual runs
  }

  // Create execution record
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      organizationId,
      triggeredByUserId: userId,
      status: "RUNNING",
      inputJson: toJson(inputJson),
      startedAt: new Date(),
    },
  });

  // Execute in topological order
  const sortedNodes = topologicalSort(nodes, edges);
  if (!sortedNodes) {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: "FAILED", error: "Workflow contains a cycle and cannot be executed", completedAt: new Date() },
    });
    return NextResponse.json({ error: "Workflow contains a cycle and cannot be executed" }, { status: 400 });
  }
  const stepOutputs: Record<string, unknown> = {};
  const skippedNodes = new Set<string>();
  let overallStatus: "COMPLETED" | "FAILED" = "COMPLETED";
  let overallError: string | null = null;

  for (const node of sortedNodes) {
    // Check if this node should be skipped (all incoming edges come from skipped nodes)
    const incomingEdges = edges.filter((e) => e.target === node.id);
    if (incomingEdges.length > 0 && incomingEdges.every((e) => skippedNodes.has(e.source))) {
      skippedNodes.add(node.id);
      await prisma.workflowExecutionLog.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeName: node.data.label ?? node.id,
          status: "SKIPPED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      continue;
    }

    // Branch skipping: only skip if ALL incoming branch-annotated edges are inactive.
    // This allows merge nodes (multiple incoming from different branches) to execute
    // when at least one active branch feeds into them.
    const branchEdges = incomingEdges.filter((e) => e.sourceHandle);
    const allBranchesInactive = branchEdges.length > 0 && branchEdges.every((edge) => {
      const parentOutput = stepOutputs[edge.source] as { branch?: string } | undefined;
      return parentOutput?.branch !== undefined && parentOutput.branch !== edge.sourceHandle;
    });

    if (allBranchesInactive) {
      skippedNodes.add(node.id);
      await prisma.workflowExecutionLog.create({
        data: {
          executionId: execution.id,
          nodeId: node.id,
          nodeName: node.data.label ?? node.id,
          status: "SKIPPED",
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
      continue;
    }

    const logEntry = await prisma.workflowExecutionLog.create({
      data: {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.data.label ?? node.id,
        status: "RUNNING",
        inputJson: toJson(node.data.config ?? {}),
        startedAt: new Date(),
      },
    });

    let result: ExecuteNodeResult;
    try {
      result = await executeNode(node.data, userId, organizationId, stepOutputs);
    } catch (err) {
      result = {
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      };
    }

    stepOutputs[node.id] = result.output;
    // Also key by label (with spaces replaced by underscores) for template resolution
    if (node.data.label) {
      stepOutputs[node.data.label.replace(/\s+/g, "_")] = result.output;
    }

    await prisma.workflowExecutionLog.update({
      where: { id: logEntry.id },
      data: {
        status: result.success ? "COMPLETED" : "FAILED",
        outputJson: result.output != null ? toJson(result.output) : undefined,
        error: result.error ?? null,
        completedAt: new Date(),
      },
    });

    if (!result.success) {
      overallStatus = "FAILED";
      overallError = result.error ?? "Node execution failed";
      // Mark remaining downstream nodes as skipped
      const downstream = getDownstream(node.id, edges, new Set(sortedNodes.map((n) => n.id)));
      for (const downId of downstream) skippedNodes.add(downId);
    }
  }

  // Update execution status
  const updatedExecution = await prisma.workflowExecution.update({
    where: { id: execution.id },
    data: {
      status: overallStatus,
      error: overallError,
      outputJson: toJson(stepOutputs),
      completedAt: new Date(),
    },
    include: {
      logs: { orderBy: { startedAt: "asc" } },
    },
  });

  return NextResponse.json(updatedExecution);
}

// Get all downstream node IDs from a given node
function getDownstream(
  nodeId: string,
  edges: WorkflowEdge[],
  allNodeIds: Set<string>
): Set<string> {
  const downstream = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && allNodeIds.has(edge.target) && !downstream.has(edge.target)) {
        downstream.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return downstream;
}
