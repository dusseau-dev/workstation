"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import dynamic from "next/dynamic";
import { Undo2, Redo2, Save, Play, History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  nodesAtom,
  edgesAtom,
  currentWorkflowIdAtom,
  selectedNodeIdAtom,
  isSavingAtom,
  canUndoAtom,
  canRedoAtom,
  undoAtom,
  redoAtom,
  saveWorkflowAtom,
  type WorkflowNode,
  type WorkflowEdge,
} from "@/lib/workflow-store";
import { NodePalette } from "@/components/workflows/node-palette";
import { NodeConfigPanel } from "@/components/workflows/node-config-panel";
import { ExecutionPanel } from "@/components/workflows/execution-panel";

// Lazy-load React Flow canvas (~200KB) — only needed when editor mounts
const WorkflowCanvasLazy = dynamic(
  () => import("@/components/workflows/canvas/workflow-canvas-provider").then((m) => ({ default: m.WorkflowCanvasProvider })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading canvas...
      </div>
    ),
  }
);
import { useFindUniqueWorkflow, useUpdateWorkflow } from "@/hooks/model";
import { FIND_UNIQUE_WORKFLOW } from "@/lib/constants";
import { useModalQuery } from "@/lib/use-modal-query";

type Props = {
  workflowId: string;
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    nodesJson: unknown;
    edgesJson: unknown;
  } | null;
};

export function WorkflowEditor({ workflowId, initialData }: Props) {
  const { data: workflow } = useFindUniqueWorkflow(
    FIND_UNIQUE_WORKFLOW(workflowId),
    { enabled: !!workflowId, refetchOnMount: false }
  );

  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setCurrentWorkflowId = useSetAtom(currentWorkflowIdAtom);
  const isSaving = useAtomValue(isSavingAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const selectedNodeId = useAtomValue(selectedNodeIdAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const save = useSetAtom(saveWorkflowAtom);
  const { openDeleteWorkflowModal } = useModalQuery();
  const { mutateAsync: updateWorkflow } = useUpdateWorkflow();

  const source = workflow ?? initialData;
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(source?.name ?? "");
  const [showHistory, setShowHistory] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const loadedWorkflowIdRef = useRef<string | null>(null);

  // Sync name when source changes
  useEffect(() => {
    if (source?.name) setNameValue(source.name);
  }, [source?.name]);

  // Load workflow data into Jotai store (only on initial load or workflow switch)
  useEffect(() => {
    if (!source) return;
    if (loadedWorkflowIdRef.current === source.id) return;
    loadedWorkflowIdRef.current = source.id;
    setCurrentWorkflowId(source.id);
    setNodes((source.nodesJson as WorkflowNode[]) ?? []);
    setEdges((source.edgesJson as WorkflowEdge[]) ?? []);
  }, [source, setNodes, setEdges, setCurrentWorkflowId]);

  // Keyboard shortcuts (skip when focused on text inputs to allow native undo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !isInput) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, save]);

  const handleNameBlur = useCallback(async () => {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== source?.name) {
      await updateWorkflow({ where: { id: workflowId }, data: { name: nameValue.trim() } });
    }
  }, [nameValue, source?.name, workflowId, updateWorkflow]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
    if (e.key === "Escape") {
      setNameValue(source?.name ?? "");
      setEditingName(false);
    }
  }, [source?.name]);

  const handleDeleteWorkflow = useCallback(() => {
    openDeleteWorkflowModal(workflowId);
  }, [openDeleteWorkflowModal, workflowId]);

  const runGuard = useRef(false);
  const handleRun = useCallback(async () => {
    if (runGuard.current) return;
    runGuard.current = true;
    setIsRunning(true);
    try {
      // Save first to ensure latest graph is persisted
      await save();
      const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Run failed");
        return;
      }
      if (data.status === "COMPLETED") {
        toast.success("Workflow completed");
      } else {
        toast.error("Workflow finished with errors");
      }
      setShowHistory(true);
      setHistoryKey((k) => k + 1);
    } catch {
      toast.error("Failed to run workflow");
    } finally {
      setIsRunning(false);
      runGuard.current = false;
    }
  }, [workflowId, save]);

  if (!source) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Workflow not found</p>
      </div>
    );
  }

  const status = source.status ?? "DRAFT";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-background shrink-0">
        <div className="flex items-center gap-3">
          {editingName ? (
            <Input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="h-8 w-48 text-lg font-semibold"
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="hover:underline">
              <h2 className="text-lg font-semibold">{nameValue || source.name}</h2>
            </button>
          )}
          <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
            {status.toLowerCase()}
          </Badge>
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => undo()} disabled={!canUndo} title="Undo (Cmd+Z)">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => redo()} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="ghost" size="icon" onClick={() => { void save(); }} title="Save (Cmd+S)">
            <Save className="h-4 w-4" />
          </Button>
          <Button variant="default" size="sm" onClick={() => { void handleRun(); }} disabled={isRunning}>
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {isRunning ? "Running..." : "Run"}
          </Button>
          <Button
            variant={showHistory ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowHistory((v) => !v)}
            title="Run History"
          >
            <History className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button variant="destructive" size="sm" onClick={handleDeleteWorkflow}>
            Delete
          </Button>
        </div>
      </div>

      {/* Main content: sidebar + canvas + config/history panel */}
      <WorkflowCanvasLazy>
        <NodePalette />
        {selectedNodeId && !showHistory ? <NodeConfigPanel /> : null}
        {showHistory ? (
          <div className="w-[320px] border-l bg-background shrink-0 overflow-hidden">
            <ExecutionPanel key={historyKey} workflowId={workflowId} />
          </div>
        ) : null}
      </WorkflowCanvasLazy>
    </div>
  );
}
