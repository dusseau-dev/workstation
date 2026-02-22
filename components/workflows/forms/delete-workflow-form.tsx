"use client";

import { toast } from "sonner";
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useDeleteWorkflow, useFindUniqueWorkflow } from "@/hooks/model";

type Props = {
  workflowId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function DeleteWorkflowForm({ workflowId, onClose, onSuccess }: Props) {
  const { data: workflow } = useFindUniqueWorkflow(
    { where: { id: workflowId } },
    { enabled: !!workflowId, refetchOnMount: false }
  );

  const {
    mutateAsync: deleteWorkflow,
    isPending,
    error,
  } = useDeleteWorkflow();

  const handleDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    await deleteWorkflow({ where: { id: workflowId } });
    onSuccess();
    toast.success("Workflow deleted successfully");
  };

  if (!workflow) return null;

  return (
    <>
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error.message || "Failed to delete workflow. Please try again."}
        </div>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          disabled={isPending}
          className="bg-red-600 hover:bg-red-700"
        >
          {isPending ? "Deleting..." : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
