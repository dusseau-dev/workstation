"use client";

import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  useFindManyWorkflow,
  useFindManyWorkflowExecution,
} from "@/hooks/model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type ExecutionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";

const STATUS_BADGE_CLASSES: Record<ExecutionStatus, string> = {
  PENDING: "bg-muted text-muted-foreground border-border",
  RUNNING: "bg-blue-500/10 text-blue-700 border-blue-500/40 dark:text-blue-300",
  COMPLETED: "bg-green-500/10 text-green-700 border-green-500/40 dark:text-green-300",
  FAILED: "bg-red-500/10 text-red-700 border-red-500/40 dark:text-red-300",
  CANCELED: "bg-muted text-muted-foreground border-border",
};

const STATUS_ICONS: Record<ExecutionStatus, typeof Loader2> = {
  PENDING: Loader2,
  RUNNING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  CANCELED: AlertCircle,
};

function formatTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string | Date, end?: string | Date | null): string {
  const s = start instanceof Date ? start : new Date(start);
  const e = end ? (end instanceof Date ? end : new Date(end)) : new Date();
  const ms = Math.max(0, e.getTime() - s.getTime());
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function formatTriggerReason(triggerType?: string | null): string {
  if (!triggerType) return "manual";
  return triggerType.replace(/_/g, " ").toLowerCase();
}

type ExecutionRow = {
  id: string;
  status: ExecutionStatus;
  startedAt: string | Date;
  completedAt?: string | Date | null;
  workflowId: string;
  workflow?: { id: string; name: string } | null;
  trigger?: { id: string; triggerType: string } | null;
};

type CardWorkflowsSectionProps = {
  taskId: string;
  boardId: string;
  taskData?: {
    title?: string;
    description?: string | null;
    priority?: string;
    assigneeId?: string | null;
    columnId?: string;
  };
};

export function CardWorkflowsSection({
  taskId,
  boardId,
  taskData,
}: CardWorkflowsSectionProps) {
  const {
    data: executions = [],
    isLoading: isLoadingExecutions,
    refetch: refetchExecutions,
  } = useFindManyWorkflowExecution(
    {
      where: { cardId: taskId },
      include: {
        workflow: { select: { id: true, name: true } },
        trigger: { select: { id: true, triggerType: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
    },
    {
      refetchInterval: (query) => {
        const data = query.state.data as ExecutionRow[] | undefined;
        const hasActive = data?.some(
          (e) => e.status === "RUNNING" || e.status === "PENDING"
        );
        return hasActive ? 3_000 : false;
      },
    }
  );

  const { data: workflows = [] } = useFindManyWorkflow({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const activeWorkflows = workflows as Array<{ id: string; name: string }>;

  const runMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            cardId: taskId,
            boardId,
            eventType: "MANUAL",
            ...taskData,
          },
          boardId,
          cardId: taskId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to run workflow"
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Workflow started");
      void refetchExecutions();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const typedExecutions = executions as ExecutionRow[];

  return (
    <>
      <Separator className="my-4" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Workflows</h4>
          {activeWorkflows.length === 0 ? (
            <span className="text-xs text-muted-foreground">No active workflows</span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={runMutation.isPending}
                >
                  {runMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Run Workflow
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeWorkflows.map((wf) => (
                  <DropdownMenuItem
                    key={wf.id}
                    disabled={runMutation.isPending}
                    onClick={() => runMutation.mutate(wf.id)}
                  >
                    {wf.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isLoadingExecutions ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading workflow history...
          </div>
        ) : typedExecutions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No workflow runs for this card.
          </p>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1">
              {typedExecutions.map((exec) => {
                const Icon = STATUS_ICONS[exec.status];
                const isSpinning = exec.status === "RUNNING" || exec.status === "PENDING";
                return (
                  <button
                    key={exec.id}
                    type="button"
                    onClick={() =>
                      window.open(
                        `/workflows/${exec.workflowId}/executions/${exec.id}`,
                        "_blank"
                      )
                    }
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring text-left transition-colors text-sm"
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSpinning && "animate-spin"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium truncate block text-sm">
                        {exec.workflow?.name ?? "Deleted workflow"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTriggerReason(exec.trigger?.triggerType)}
                        {" \u00b7 "}
                        {formatTimestamp(exec.startedAt)}
                        {exec.completedAt && (
                          <>
                            {" \u00b7 "}
                            {formatDuration(exec.startedAt, exec.completedAt)}
                          </>
                        )}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-xs",
                        STATUS_BADGE_CLASSES[exec.status]
                      )}
                    >
                      {exec.status.toLowerCase()}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
}
