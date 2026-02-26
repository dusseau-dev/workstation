"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useFindFirstWorkflowExecution } from "@/hooks/model";
import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ExecutionCanvasNodeState } from "@/components/workflows/workflow-execution-graph";

const WorkflowExecutionGraph = dynamic(
  () =>
    import("@/components/workflows/workflow-execution-graph").then((module) => ({
      default: module.WorkflowExecutionGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[440px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading execution graph...
      </div>
    ),
  }
);

type ExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";
type LogStatus = "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

type ExecutionLog = {
  id: string;
  nodeId: string;
  nodeName: string;
  status: LogStatus;
  inputJson: unknown;
  outputJson: unknown;
  error: string | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
};

type ExecutionDetailRecord = {
  id: string;
  status: ExecutionStatus;
  error: string | null;
  startedAt: string | Date;
  completedAt: string | Date | null;
  outputJson: unknown;
  workflowId: string;
  workflow: {
    id: string;
    name: string;
    nodesJson: unknown;
    edgesJson: unknown;
  };
  trigger: {
    id: string;
    triggerType: string;
  } | null;
  triggeredByUser: {
    id: string;
    name: string | null;
  } | null;
  logs: ExecutionLog[];
};

type RetryResponse = {
  executionId?: string;
  status?: string;
  error?: string;
};

type Props = {
  workflowId: string;
  executionId: string;
};

const STATUS_BADGE_CLASSES: Record<ExecutionStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  RUNNING: "bg-blue-500/10 text-blue-700 border-blue-500/40 dark:text-blue-300",
  COMPLETED: "bg-green-500/10 text-green-700 border-green-500/40 dark:text-green-300",
  FAILED: "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  CANCELED: "bg-muted text-muted-foreground border-border",
};

const LOG_STATUS_BADGE_CLASSES: Record<LogStatus, string> = {
  RUNNING: "bg-blue-500/10 text-blue-700 border-blue-500/40 dark:text-blue-300",
  COMPLETED: "bg-green-500/10 text-green-700 border-green-500/40 dark:text-green-300",
  FAILED: "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  SKIPPED: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<ExecutionStatus, typeof Loader2> = {
  PENDING: Loader2,
  RUNNING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  CANCELED: AlertCircle,
};

function toWorkflowNodes(value: unknown): WorkflowNode[] {
  return Array.isArray(value) ? (value as WorkflowNode[]) : [];
}

function toWorkflowEdges(value: unknown): WorkflowEdge[] {
  return Array.isArray(value) ? (value as WorkflowEdge[]) : [];
}

function getExecutionGraphSnapshot(outputJson: unknown): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} | null {
  if (!outputJson || typeof outputJson !== "object" || Array.isArray(outputJson)) {
    return null;
  }

  const meta = (outputJson as Record<string, unknown>).__meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }

  const snapshot = (meta as Record<string, unknown>).workflowSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }

  const nodes = toWorkflowNodes((snapshot as Record<string, unknown>).nodes);
  const edges = toWorkflowEdges((snapshot as Record<string, unknown>).edges);
  return { nodes, edges };
}

function formatTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(startValue: string | Date, endValue?: string | Date | null): string {
  const start = startValue instanceof Date ? startValue : new Date(startValue);
  const end = endValue
    ? endValue instanceof Date
      ? endValue
      : new Date(endValue)
    : new Date();

  const ms = Math.max(0, end.getTime() - start.getTime());

  if (ms < 1_000) {
    return `${ms}ms`;
  }

  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)}s`;
  }

  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function formatEnumValue(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

function mapLogStatusToNodeState(status: LogStatus): ExecutionCanvasNodeState {
  if (status === "RUNNING") return "RUNNING";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "FAILED") return "FAILED";
  if (status === "SKIPPED") return "SKIPPED";
  return "NOT_REACHED";
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function JsonDisclosure({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  const hasValue = value !== null && value !== undefined;

  return (
    <details className="group rounded-md border bg-muted/20">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="border-t px-3 py-2">
        {hasValue ? (
          <pre className="overflow-x-auto text-xs leading-relaxed">
            {stringifyJson(value)}
          </pre>
        ) : (
          <p className="text-xs text-muted-foreground">No data</p>
        )}
      </div>
    </details>
  );
}

function getTriggeredBy(execution: ExecutionDetailRecord): string {
  if (execution.triggeredByUser?.name) {
    return execution.triggeredByUser.name;
  }

  if (execution.trigger?.triggerType) {
    return `automation (${formatEnumValue(execution.trigger.triggerType)})`;
  }

  return "automation";
}

export function WorkflowExecutionDetail({ workflowId, executionId }: Props) {
  const router = useRouter();
  const [retryingNodeId, setRetryingNodeId] = useState<string | null>(null);

  const executionQuery = useFindFirstWorkflowExecution(
    {
      where: {
        id: executionId,
        workflowId,
      },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            nodesJson: true,
            edgesJson: true,
          },
        },
        triggeredByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        trigger: {
          select: {
            id: true,
            triggerType: true,
          },
        },
        logs: {
          orderBy: {
            startedAt: "asc",
          },
        },
      },
    },
    {
      enabled: Boolean(workflowId && executionId),
      refetchOnWindowFocus: true,
      refetchInterval: (query) => {
        const status = (query.state.data as { status?: string } | undefined)
          ?.status;
        return status === "RUNNING" || status === "PENDING" ? 2_000 : false;
      },
    }
  );

  const execution = executionQuery.data as ExecutionDetailRecord | null | undefined;
  const graphSnapshot = useMemo(
    () => getExecutionGraphSnapshot(execution?.outputJson),
    [execution?.outputJson]
  );

  const nodes = useMemo(() => {
    return graphSnapshot?.nodes ?? toWorkflowNodes(execution?.workflow?.nodesJson);
  }, [graphSnapshot, execution?.workflow?.nodesJson]);

  const edges = useMemo(() => {
    return graphSnapshot?.edges ?? toWorkflowEdges(execution?.workflow?.edgesJson);
  }, [graphSnapshot, execution?.workflow?.edgesJson]);

  const nodeTypeById = useMemo(() => {
    const map = new Map<string, string>();

    for (const node of nodes) {
      if (typeof node.id !== "string") {
        continue;
      }

      if (typeof node.data?.subtype === "string") {
        map.set(node.id, node.data.subtype);
        continue;
      }

      if (typeof node.data?.type === "string") {
        map.set(node.id, node.data.type);
      }
    }

    return map;
  }, [nodes]);

  const nodeStates = useMemo<Record<string, ExecutionCanvasNodeState>>(() => {
    const states: Record<string, ExecutionCanvasNodeState> = {};

    for (const log of execution?.logs ?? []) {
      states[log.nodeId] = mapLogStatusToNodeState(log.status);
    }

    return states;
  }, [execution?.logs]);

  const retryMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      const response = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          retryExecutionId: executionId,
          retryFromNodeId: nodeId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as RetryResponse;

      if (!response.ok || !payload.executionId) {
        throw new Error(payload.error ?? "Failed to retry workflow from this step");
      }

      return payload;
    },
    onSuccess: (payload) => {
      toast.success("Retry started");
      if (payload.executionId) {
        router.push(`/workflows/${workflowId}/executions/${payload.executionId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function handleRetryFromNode(nodeId: string) {
    setRetryingNodeId(nodeId);
    try {
      await retryMutation.mutateAsync(nodeId);
    } finally {
      setRetryingNodeId(null);
    }
  }

  if (executionQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading execution details...
        </div>
      </div>
    );
  }

  if (executionQuery.isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load execution</CardTitle>
            <CardDescription>
              Something went wrong while fetching execution details. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => void executionQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/workflows/${workflowId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Execution not found</CardTitle>
            <CardDescription>
              This execution does not exist or you do not have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/workflows/${workflowId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to workflow
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[execution.status];

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Button asChild size="sm" variant="ghost" className="-ml-2">
            <Link href={`/workflows/${workflowId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to workflow
            </Link>
          </Button>

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {execution.workflow?.name ?? "Workflow"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Triggered by <span className="font-medium">{getTriggeredBy(execution)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total duration: <span className="font-medium">{formatDuration(execution.startedAt, execution.completedAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("gap-1 border text-xs uppercase tracking-wide", STATUS_BADGE_CLASSES[execution.status])}
          >
            <StatusIcon
              className={cn(
                "h-3.5 w-3.5",
                execution.status === "RUNNING" ? "animate-spin" : ""
              )}
            />
            {formatEnumValue(execution.status)}
          </Badge>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void executionQuery.refetch()}
            disabled={executionQuery.isFetching}
            title="Refresh"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4",
                executionQuery.isFetching ? "animate-spin" : ""
              )}
            />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Execution Graph</CardTitle>
          <CardDescription>
            Node colors indicate execution state: gray (not reached), blue (running), green (completed), red (failed), amber dashed (skipped).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <WorkflowExecutionGraph
            nodes={nodes}
            edges={edges}
            nodeStates={nodeStates}
          />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Step Timeline</CardTitle>
          <CardDescription>
            Ordered step logs with inputs, outputs, and error details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          {execution.logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No step logs yet.</p>
          ) : (
            execution.logs.map((log) => {
              const nodeType = nodeTypeById.get(log.nodeId) ?? "unknown";
              const isRetryingThisNode =
                retryMutation.isPending && retryingNodeId === log.nodeId;

              return (
                <div key={log.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{log.nodeName}</p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {formatEnumValue(nodeType)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          LOG_STATUS_BADGE_CLASSES[log.status]
                        )}
                      >
                        {formatEnumValue(log.status)}
                      </Badge>
                      <span className="text-muted-foreground">
                        Start: {formatTimestamp(log.startedAt)}
                      </span>
                      <span className="text-muted-foreground">
                        Duration: {formatDuration(log.startedAt, log.completedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <JsonDisclosure title="Input data" value={log.inputJson} />
                    <JsonDisclosure title="Output data" value={log.outputJson} />

                    {log.status === "FAILED" ? (
                      <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3">
                        <p className="mb-2 text-xs font-medium text-red-700 dark:text-red-300">
                          Error: {log.error ?? "Step failed without an explicit error message."}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleRetryFromNode(log.nodeId)}
                          disabled={retryingNodeId !== null}
                        >
                          {isRetryingThisNode ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-3.5 w-3.5" />
                          )}
                          Retry from here
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
