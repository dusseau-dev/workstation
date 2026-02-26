"use client";

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { WorkflowEdge, WorkflowNode } from "@/lib/workflow-store";
import { cn } from "@/lib/utils";

export type ExecutionCanvasNodeState =
  | "NOT_REACHED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

type Props = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  nodeStates: Record<string, ExecutionCanvasNodeState>;
};

const STATUS_STYLES: Record<
  ExecutionCanvasNodeState,
  { container: string; label: string; dot: string }
> = {
  NOT_REACHED: {
    container: "border-border bg-muted/30",
    label: "text-muted-foreground",
    dot: "bg-muted-foreground/80",
  },
  RUNNING: {
    container: "border-blue-500/60 bg-blue-500/10 animate-pulse",
    label: "text-blue-600 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    container: "border-green-500/60 bg-green-500/10",
    label: "text-green-700 dark:text-green-300",
    dot: "bg-green-500",
  },
  FAILED: {
    container: "border-red-500/60 bg-red-500/10",
    label: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  SKIPPED: {
    container: "border-amber-500/40 bg-amber-500/5 border-dashed",
    label: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-400",
  },
};

function formatNodeType(nodeType: string): string {
  return nodeType.replace(/_/g, " ");
}

export function WorkflowExecutionGraph({ nodes, edges, nodeStates }: Props) {
  const flowNodes = useMemo<Node[]>(() => {
    return nodes.map((node) => {
      const status = nodeStates[node.id] ?? "NOT_REACHED";
      const nodeType =
        typeof node.data?.subtype === "string"
          ? node.data.subtype
          : typeof node.data?.type === "string"
            ? node.data.type
            : "node";
      const label =
        typeof node.data?.label === "string" && node.data.label.length > 0
          ? node.data.label
          : node.id;
      const statusStyle = STATUS_STYLES[status];

      return {
        ...node,
        draggable: false,
        selectable: false,
        connectable: false,
        data: {
          label: (
            <div className="min-w-[170px] px-3 py-2 text-left">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", statusStyle.dot)}
                  aria-hidden
                />
                <span className={cn("text-sm font-semibold capitalize", statusStyle.label)}>
                  {label}
                </span>
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatNodeType(nodeType)}
              </p>
            </div>
          ),
        },
        className: cn("rounded-md border-2 shadow-sm", statusStyle.container),
        style: {
          ...node.style,
          borderRadius: 10,
          padding: 0,
        },
      };
    });
  }, [nodes, nodeStates]);

  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => ({
      ...edge,
      animated: true,
      selectable: false,
      style: {
        ...edge.style,
        strokeWidth: 2,
        stroke: "hsl(var(--muted-foreground))",
        opacity: 0.45,
      },
    }));
  }, [edges]);

  return (
    <div className="h-[440px] w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
