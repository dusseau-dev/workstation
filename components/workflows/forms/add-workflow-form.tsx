"use client";

import { Button } from "@/components/ui/button";
import z from "zod";
import { WorkflowCreateWithoutRefineSchema } from "@zenstackhq/runtime/zod/models";
import AutoForm, { AutoFormSubmit } from "@/components/ui/auto-form";
import { useCreateWorkflow } from "@/hooks/model";
import { toast } from "sonner";

const workflowCreateSchema = WorkflowCreateWithoutRefineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  organizationId: true,
  status: true,
  nodesJson: true,
  edgesJson: true,
});

interface AddWorkflowFormProps {
  onClose: () => void;
  onSuccess: (workflowId: string) => void;
}

export function AddWorkflowForm({ onClose, onSuccess }: AddWorkflowFormProps) {
  const {
    mutateAsync: createWorkflow,
    isPending,
    error,
  } = useCreateWorkflow({ optimisticUpdate: true });

  const handleSubmit = async (data: z.infer<typeof workflowCreateSchema>) => {
    try {
      const result = await createWorkflow({
        data: {
          ...data,
          nodesJson: [
            {
              id: "trigger-1",
              type: "trigger",
              position: { x: 250, y: 50 },
              data: { label: "Trigger", type: "trigger", config: { triggerType: "Manual" } },
            },
          ],
          edgesJson: [],
        },
      });

      if (result?.id) {
        toast.success("Workflow created successfully");
        onSuccess(result.id);
      }
    } catch (err) {
      toast.error("Failed to create workflow");
      console.error("Error creating workflow:", err);
    }
  };

  return (
    <AutoForm
      className="w-full"
      formSchema={workflowCreateSchema}
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error.message || "Failed to create workflow. Please try again."}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <AutoFormSubmit disabled={isPending}>
          {isPending ? "Creating..." : "Create Workflow"}
        </AutoFormSubmit>
        <Button variant="outline" onClick={onClose} disabled={isPending} type="button">
          Cancel
        </Button>
      </div>
    </AutoForm>
  );
}
