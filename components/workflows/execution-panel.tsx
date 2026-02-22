"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Loader2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type ExecutionLog = {
  id: string;
  nodeId: string;
  nodeName: string;
  status: "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  inputJson?: unknown;
  outputJson?: unknown;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
};

type Execution = {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";
  error?: string | null;
  inputJson?: unknown;
  outputJson?: unknown;
  startedAt: string;
  completedAt?: string | null;
  triggeredByUser?: { id: string; name: string; image?: string | null } | null;
  logs: ExecutionLog[];
};

const STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
  FAILED: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" },
  RUNNING: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Running" },
  PENDING: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
  CANCELED: { icon: SkipForward, color: "text-muted-foreground", bg: "bg-muted", label: "Canceled" },
  SKIPPED: { icon: SkipForward, color: "text-muted-foreground", bg: "bg-muted", label: "Skipped" },
} as const;

function StatusIcon({ status, className }: { status: keyof typeof STATUS_CONFIG; className?: string }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Icon
      className={`${config.color} ${className ?? "w-4 h-4"} ${status === "RUNNING" ? "animate-spin" : ""}`}
    />
  );
}

function formatDuration(start: string, end?: string | null): string {
  if (!end) return "...";
  const ms = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(date: string): string {
  const d = new Date(date);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function LogDetail({ log }: { log: ExecutionLog }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[log.status];

  return (
    <div className="border rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
      >
        <StatusIcon status={log.status} className="w-3.5 h-3.5 shrink-0" />
        <span className="text-sm font-medium truncate flex-1 text-left">{log.nodeName}</span>
        <span className="text-[11px] text-muted-foreground shrink-0">
          {formatDuration(log.startedAt, log.completedAt)}
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className={`text-[10px] h-4 ${config.color}`}>
              {config.label}
            </Badge>
            <span>{formatTime(log.startedAt)}</span>
          </div>

          {log.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
              <p className="text-xs text-red-500 font-mono whitespace-pre-wrap">{log.error}</p>
            </div>
          )}

          {log.outputJson != null && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Output</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-32 font-mono">
                {JSON.stringify(log.outputJson, null, 2)}
              </pre>
            </div>
          )}

          {log.inputJson != null && (
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Input</p>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto max-h-32 font-mono">
                {JSON.stringify(log.inputJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExecutionDetail({ execution, onBack }: { execution: Execution; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-3 h-3" />
          All runs
        </button>
        <div className="flex items-center gap-2">
          <StatusIcon status={execution.status} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Run {execution.id.slice(-6)}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatDate(execution.startedAt)} at {formatTime(execution.startedAt)}
              {" - "}
              {formatDuration(execution.startedAt, execution.completedAt)}
            </p>
          </div>
        </div>
        {execution.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded p-2">
            <p className="text-xs text-red-500">{execution.error}</p>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Steps ({execution.logs.length})
          </p>
          {execution.logs.map((log) => (
            <LogDetail key={log.id} log={log} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function ExecutionPanel({ workflowId }: { workflowId: string }) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/executions`);
      if (res.ok) {
        const data = await res.json();
        setExecutions(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    void fetchExecutions();
  }, [fetchExecutions]);

  // Derive selected execution from ID — automatically refreshes when executions update
  const selectedExecution = selectedId ? executions.find((e) => e.id === selectedId) ?? null : null;

  if (selectedExecution) {
    return (
      <ExecutionDetail
        execution={selectedExecution}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Run History</h3>
            <p className="text-xs text-muted-foreground">
              {executions.length} run{executions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => void fetchExecutions()}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && executions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">No runs yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click Run to execute this workflow
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {executions.map((exec) => {
              const config = STATUS_CONFIG[exec.status];
              return (
                <button
                  key={exec.id}
                  onClick={() => setSelectedId(exec.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                >
                  <StatusIcon status={exec.status} className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">Run {exec.id.slice(-6)}</span>
                      <Badge variant="outline" className={`text-[10px] h-4 ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(exec.startedAt)} at {formatTime(exec.startedAt)}
                      {exec.completedAt && ` - ${formatDuration(exec.startedAt, exec.completedAt)}`}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
