"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowCanvas } from "@/components/workflows/canvas/workflow-canvas";

export function WorkflowCanvasProvider({ children }: { children?: React.ReactNode }) {
  return (
    <ReactFlowProvider>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 h-full">
          <WorkflowCanvas />
        </div>
        {children}
      </div>
    </ReactFlowProvider>
  );
}
