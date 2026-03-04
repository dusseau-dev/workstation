"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Zap,
  Plus,
  Trash2,
  ArrowRightLeft,
  FileInput,
  Pencil,
  Clock,
  Webhook,
  Hand,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFindManyWorkflowTrigger,
  useCreateWorkflowTrigger,
  useUpdateWorkflowTrigger,
  useDeleteWorkflowTrigger,
  useFindManyWorkflow,
  useFindManyWorkflowExecution,
} from "@/hooks/model";

type TriggerType =
  | "CARD_CREATED"
  | "CARD_MOVED"
  | "CARD_UPDATED"
  | "SCHEDULE"
  | "WEBHOOK"
  | "MANUAL";

const TRIGGER_TYPE_CONFIG: Record<
  TriggerType,
  { icon: typeof Zap; label: string; description: string }
> = {
  CARD_MOVED: {
    icon: ArrowRightLeft,
    label: "Card Moved",
    description: "When a card is moved between columns",
  },
  CARD_CREATED: {
    icon: FileInput,
    label: "Card Created",
    description: "When a new card is created in a column",
  },
  CARD_UPDATED: {
    icon: Pencil,
    label: "Card Updated",
    description: "When a card field is changed",
  },
  SCHEDULE: {
    icon: Clock,
    label: "Schedule",
    description: "Run on a cron schedule",
  },
  WEBHOOK: {
    icon: Webhook,
    label: "Webhook",
    description: "Triggered by an external webhook",
  },
  MANUAL: {
    icon: Hand,
    label: "Manual",
    description: "Triggered manually from the UI",
  },
};

const EXECUTION_STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle2, color: "text-green-500", label: "Completed" },
  FAILED: { icon: XCircle, color: "text-red-500", label: "Failed" },
  RUNNING: { icon: Loader2, color: "text-blue-500", label: "Running" },
  PENDING: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  CANCELED: { icon: XCircle, color: "text-muted-foreground", label: "Canceled" },
} as const;

type ColumnInfo = { id: string; title: string };

type Props = {
  boardId: string;
  columns: ColumnInfo[];
};

type TriggerConfig = {
  fromColumnId?: string;
  toColumnId?: string;
  columnId?: string;
  watchedField?: string;
  cron?: string;
  inputMapping?: Record<string, string>;
};

export function BoardAutomations({ boardId, columns }: Props) {
  const columnMap = useMemo(
    () => new Map(columns.map((c) => [c.id, c.title])),
    [columns]
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [triggerType, setTriggerType] = useState<TriggerType>("CARD_MOVED");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");
  const [config, setConfig] = useState<TriggerConfig>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch triggers for this board
  const { data: triggers = [], isLoading: triggersLoading } =
    useFindManyWorkflowTrigger({
      where: { boardId },
      include: {
        workflow: { select: { id: true, name: true, status: true } },
        executions: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { id: true, status: true, startedAt: true },
        },
      },
      orderBy: { createdAt: "desc" as const },
    });

  // Fetch org workflows for the dropdown
  const { data: workflows = [] } = useFindManyWorkflow({
    where: { status: { not: "ARCHIVED" } },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" as const },
  });

  // Fetch recent executions for this board
  const { data: recentExecutions = [], isLoading: executionsLoading } =
    useFindManyWorkflowExecution({
      where: { boardId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        workflow: { select: { id: true, name: true } },
        triggeredByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" as const },
      take: 20,
    });

  const createTrigger = useCreateWorkflowTrigger();
  const updateTrigger = useUpdateWorkflowTrigger();
  const deleteTrigger = useDeleteWorkflowTrigger();

  function resetForm() {
    setTriggerType("CARD_MOVED");
    setSelectedWorkflowId("");
    setConfig({});
  }

  const handleCreate = useCallback(async () => {
    if (!selectedWorkflowId) {
      toast.error("Please select a workflow");
      return;
    }
    setIsSubmitting(true);
    try {
      await createTrigger.mutateAsync({
        data: {
          workflow: { connect: { id: selectedWorkflowId } },
          board: { connect: { id: boardId } },
          triggerType,
          configJson: JSON.parse(JSON.stringify(config)),
          enabled: true,
        },
      });
      toast.success("Automation created");
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create automation");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedWorkflowId, boardId, triggerType, config, createTrigger]);

  const handleToggleEnabled = useCallback(
    async (triggerId: string, enabled: boolean) => {
      try {
        await updateTrigger.mutateAsync({
          where: { id: triggerId },
          data: { enabled },
        });
      } catch {
        toast.error("Failed to update trigger");
      }
    },
    [updateTrigger]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteTrigger.mutateAsync({ where: { id: deleteTarget } });
      toast.success("Automation deleted");
    } catch {
      toast.error("Failed to delete automation");
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteTrigger]);

  function describeTrigger(
    type: TriggerType,
    cfg: TriggerConfig,
    workflowName?: string
  ): string {
    const target = workflowName ? ` Run "${workflowName}"` : "";
    switch (type) {
      case "CARD_MOVED": {
        const from = columnMap.get(cfg.fromColumnId ?? "");
        const to = columnMap.get(cfg.toColumnId ?? "");
        if (from && to) return `When card moves from "${from}" to "${to}".${target}`;
        if (to) return `When card moves to "${to}".${target}`;
        return `When any card is moved.${target}`;
      }
      case "CARD_CREATED": {
        const col = columnMap.get(cfg.columnId ?? "");
        if (col) return `When card created in "${col}".${target}`;
        return `When any card is created.${target}`;
      }
      case "CARD_UPDATED":
        return cfg.watchedField
          ? `When card "${cfg.watchedField}" changes.${target}`
          : `When any card is updated.${target}`;
      case "SCHEDULE":
        return cfg.cron
          ? `Scheduled: ${cfg.cron}.${target}`
          : `On schedule.${target}`;
      case "WEBHOOK":
        return `Triggered via webhook.${target}`;
      case "MANUAL":
        return `Triggered manually.${target}`;
    }
  }

  function formatTime(date: Date | string | null | undefined): string {
    if (!date) return "---";
    const d = new Date(typeof date === "string" ? date : date.toISOString());
    if (isNaN(d.getTime())) return "---";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "just now";
    if (diffMs < 60_000) return "just now";
    if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
    if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automations
          </h3>
          <p className="text-sm text-muted-foreground">
            Trigger workflows based on board events
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Automation
        </Button>
      </div>

      {/* Trigger List */}
      <div className="space-y-3">
        {triggersLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : triggers.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No automations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add an automation to trigger workflows from board events
            </p>
          </div>
        ) : (
          triggers.map((trigger) => {
            const typeConfig =
              TRIGGER_TYPE_CONFIG[trigger.triggerType as TriggerType] ??
              TRIGGER_TYPE_CONFIG.MANUAL;
            const Icon = typeConfig.icon;
            const triggerConfig = (trigger.configJson ?? {}) as TriggerConfig;
            const workflow = (trigger as { workflow?: { name: string } }).workflow;
            const executions = (
              trigger as unknown as {
                executions?: { startedAt: Date | string; status: string }[];
              }
            ).executions;
            const lastExec = executions?.[0];

            return (
              <div
                key={trigger.id}
                className="flex items-center gap-3 border rounded-lg p-4"
              >
                <div className="shrink-0 h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {describeTrigger(
                      trigger.triggerType as TriggerType,
                      triggerConfig,
                      workflow?.name
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-4">
                      {typeConfig.label}
                    </Badge>
                    {lastExec && (
                      <span className="text-[11px] text-muted-foreground">
                        Last run: {formatTime(lastExec.startedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={trigger.enabled}
                  onCheckedChange={(checked) =>
                    handleToggleEnabled(trigger.id, checked)
                  }
                  aria-label={`${trigger.enabled ? "Disable" : "Enable"} automation`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(trigger.id)}
                  aria-label="Delete automation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Run History — always shown per requirements */}
      <Separator />
      <div>
        <h4 className="text-sm font-semibold mb-3">Recent Runs</h4>
        {executionsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : recentExecutions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No runs yet</p>
            <p className="text-xs mt-1">
              Executions triggered from this board will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {recentExecutions.map((exec) => {
                const statusConfig =
                  EXECUTION_STATUS_CONFIG[
                    exec.status as keyof typeof EXECUTION_STATUS_CONFIG
                  ] ?? EXECUTION_STATUS_CONFIG.PENDING;
                const StatusIcon = statusConfig.icon;
                const workflow = (
                  exec as unknown as { workflow?: { name: string } }
                ).workflow;

                return (
                  <div
                    key={exec.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-left"
                  >
                    <StatusIcon
                      className={`h-4 w-4 shrink-0 ${statusConfig.color} ${
                        exec.status === "RUNNING" ? "animate-spin" : ""
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {workflow?.name ?? "Unknown workflow"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatTime(exec.startedAt)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 ${statusConfig.color}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this automation. Any future board events
              will no longer trigger the associated workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Automation Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add Automation</DialogTitle>
            <DialogDescription>
              Configure a trigger to run a workflow when a board event occurs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Trigger Type */}
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => {
                  setTriggerType(v as TriggerType);
                  setConfig({});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_TYPE_CONFIG) as TriggerType[]).map(
                    (type) => {
                      const cfg = TRIGGER_TYPE_CONFIG[type];
                      const TypeIcon = cfg.icon;
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            <span>{cfg.label}</span>
                          </div>
                        </SelectItem>
                      );
                    }
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger-specific config */}
            {triggerType === "CARD_MOVED" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>From Column</Label>
                  <Select
                    value={config.fromColumnId ?? "any"}
                    onValueChange={(v) =>
                      setConfig((c) => ({
                        ...c,
                        fromColumnId: v === "any" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any column</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Column</Label>
                  <Select
                    value={config.toColumnId ?? "any"}
                    onValueChange={(v) =>
                      setConfig((c) => ({
                        ...c,
                        toColumnId: v === "any" ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any column</SelectItem>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {triggerType === "CARD_CREATED" && (
              <div className="space-y-2">
                <Label>In Column</Label>
                <Select
                  value={config.columnId ?? "any"}
                  onValueChange={(v) =>
                    setConfig((c) => ({
                      ...c,
                      columnId: v === "any" ? undefined : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any column</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {triggerType === "CARD_UPDATED" && (
              <div className="space-y-2">
                <Label>Watched Field</Label>
                <Select
                  value={config.watchedField ?? "any"}
                  onValueChange={(v) =>
                    setConfig((c) => ({
                      ...c,
                      watchedField: v === "any" ? undefined : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any field</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="description">Description</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="assigneeId">Assignee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {triggerType === "SCHEDULE" && (
              <div className="space-y-2">
                <Label>Cron Expression</Label>
                <Input
                  placeholder="*/30 * * * * (every 30 min)"
                  value={config.cron ?? ""}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, cron: e.target.value }))
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Standard cron format: minute hour day month weekday
                </p>
              </div>
            )}

            {(triggerType === "WEBHOOK" || triggerType === "MANUAL") && (
              <p className="text-xs text-muted-foreground py-2">
                No additional configuration needed for {TRIGGER_TYPE_CONFIG[triggerType].label.toLowerCase()} triggers.
              </p>
            )}

            <Separator />

            {/* Workflow Selection */}
            <div className="space-y-2">
              <Label>Workflow to Run</Label>
              <Select
                value={selectedWorkflowId}
                onValueChange={setSelectedWorkflowId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {workflows.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No workflows available
                    </SelectItem>
                  ) : (
                    workflows.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <div className="flex items-center gap-2">
                          <span>{w.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 ml-1"
                          >
                            {(w.status as string).toLowerCase()}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Input Mapping */}
            <div className="space-y-2">
              <Label>Input Mapping</Label>
              <p className="text-[11px] text-muted-foreground">
                Card data is automatically passed as workflow input: title,
                description, columnId, assigneeId, priority, cardId, boardId.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
