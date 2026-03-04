"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowNodeData } from "@/lib/workflow-store";
import { NODE_TYPE_REGISTRY, CATEGORY_COLORS, type NodeSubtype } from "@/lib/workflow-node-types";

export function ActionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const def = nodeData.subtype ? NODE_TYPE_REGISTRY[nodeData.subtype as NodeSubtype] : null;
  const Icon = def?.icon ?? Zap;
  const colors = CATEGORY_COLORS.action;

  return (
    <Card className={`w-48 cursor-pointer transition-all ${selected ? "ring-2 ring-primary" : ""} ${nodeData.enabled === false ? "opacity-50" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-3 !h-3" />
      <CardHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${colors.bg} ${colors.text}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">{nodeData.label}</CardTitle>
            {nodeData.description && (
              <p className="text-xs text-muted-foreground truncate">{nodeData.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
}
