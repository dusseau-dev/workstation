"use client";

import { Button } from "@/components/ui/button";
import z from "zod";
import { WorkflowUpdateWithoutRefineSchema } from "@zenstackhq/runtime/zod/models";
import AutoForm, { AutoFormSubmit } from "@/components/ui/auto-form";
import { useUpdateWorkflow, useFindUniqueWorkflow } from "@/hooks/model";
import { toast } from "sonner";

const workflowEditSchema = WorkflowUpdateWithoutRefineSchema.pick({
  name: true,
  description: true,
});

interface EditWorkflowFormProps {
  workflowId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditWorkflowForm({ workflowId, onClose, onSuccess }: EditWorkflowFormProps) {
  const { data: workflow } = useFindUniqueWorkflow(
    { where: { id: workflowId } },
    { enabled: !!workflowId, refetchOnMount: false }
  );

  const {
    mutateAsync: updateWorkflow,
    isPending,
    error,
  } = useUpdateWorkflow({ optimisticUpdate: true });

  const handleSubmit = async (data: z.infer<typeof workflowEditSchema>) => {
    try {
      await updateWorkflow({
        where: { id: workflowId },
        data,
      });
      toast.success("Workflow updated successfully");
      onSuccess();
    } catch (err) {
      toast.error("Failed to update workflow");
      console.error("Error updating workflow:", err);
    }
  };

  if (!workflow) return null;

  return (
    <AutoForm
      className="w-full"
      formSchema={workflowEditSchema}
      onSubmit={handleSubmit}
      values={{ name: workflow.name, description: workflow.description }}
    >
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error.message || "Failed to update workflow. Please try again."}
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <AutoFormSubmit disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </AutoFormSubmit>
        <Button variant="outline" onClick={onClose} disabled={isPending} type="button">
          Cancel
        </Button>
      </div>
    </AutoForm>
  );
}
