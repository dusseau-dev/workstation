"use client";

import { useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAtom, useSetAtom } from "jotai";
import {
  nodesAtom,
  edgesAtom,
  selectedNodeIdAtom,
  onNodesChangeAtom,
  onEdgesChangeAtom,
  onConnectAtom,
  addNodeAtom,
  addComposioNodeAtom,
  saveWorkflowAtom,
  type WorkflowNode,
} from "@/lib/workflow-store";
import { NODE_TYPE_REGISTRY, type NodeSubtype } from "@/lib/workflow-node-types";
import { TriggerNode } from "@/components/workflows/canvas/trigger-node";
import { ActionNode } from "@/components/workflows/canvas/action-node";
import { AiNode } from "@/components/workflows/canvas/ai-node";
import { LogicNode } from "@/components/workflows/canvas/logic-node";
import { AnimatedEdge } from "@/components/workflows/canvas/edge";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AiNode,
  logic: LogicNode,
};

const edgeTypes: EdgeTypes = {
  animated: AnimatedEdge,
};

export function WorkflowCanvas() {
  const [nodes] = useAtom(nodesAtom);
  const [edges] = useAtom(edgesAtom);
  const onNodesChange = useSetAtom(onNodesChangeAtom);
  const onEdgesChange = useSetAtom(onEdgesChangeAtom);
  const onConnect = useSetAtom(onConnectAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeIdAtom);
  const addNode = useSetAtom(addNodeAtom);
  const addComposioNode = useSetAtom(addComposioNodeAtom);
  const save = useSetAtom(saveWorkflowAtom);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const { screenToFlowPosition } = useReactFlow();

  // Debounced autosave on any change — surfaces errors via toast
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await save();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Save failed";
        console.error("[workflow autosave]", message);
        toast.error(message);
      }
    }, 1000);
  }, [save]);

  // Save on node/edge changes (skip initial load to avoid redundant save)
  useEffect(() => {
    if (nodes.length === 0) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    debouncedSave();
  }, [nodes, edges, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, node: WorkflowNode) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Check for Composio action drop first
    const composioData = event.dataTransfer.getData("application/workflow-composio-action");
    if (composioData) {
      try {
        const { appName, actionName, actionLabel } = JSON.parse(composioData);
        addComposioNode({ appName, actionName, actionLabel, position });
        return;
      } catch {
        // Fall through to standard handler
      }
    }

    // Standard node drop
    const subtype = event.dataTransfer.getData("application/workflow-node-subtype") as NodeSubtype;
    if (!subtype || !NODE_TYPE_REGISTRY[subtype]) return;
    addNode({ subtype, position });
  }, [screenToFlowPosition, addNode, addComposioNode]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "animated" }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
