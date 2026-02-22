"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Calendar, Webhook, ArrowRightLeft, Plus, PenSquare } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkflowNodeData } from "@/lib/workflow-store";
import { NODE_TYPE_REGISTRY, CATEGORY_COLORS, type NodeSubtype } from "@/lib/workflow-node-types";

// Fallback icons for nodes saved before subtype was added
const legacyTriggerIcons: Record<string, React.ElementType> = {
  Manual: Play,
  MANUAL: Play,
  CARD_CREATED: Plus,
  CARD_MOVED: ArrowRightLeft,
  CARD_UPDATED: PenSquare,
  SCHEDULE: Calendar,
  WEBHOOK: Webhook,
};

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const triggerType = (nodeData.config?.triggerType as string) ?? "Manual";

  const def = nodeData.subtype ? NODE_TYPE_REGISTRY[nodeData.subtype as NodeSubtype] : null;
  const Icon = def?.icon ?? legacyTriggerIcons[triggerType] ?? Play;
  const colors = CATEGORY_COLORS.trigger;

  return (
    <Card className={`w-48 cursor-pointer transition-all ${selected ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-md ${colors.bg} ${colors.text}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm truncate">{nodeData.label}</CardTitle>
            <p className="text-xs text-muted-foreground truncate">
              {triggerType.replace(/_/g, " ").toLowerCase()}
            </p>
          </div>
        </div>
      </CardHeader>
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3" />
    </Card>
  );
}
