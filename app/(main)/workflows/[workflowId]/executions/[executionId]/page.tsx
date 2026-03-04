import { WorkflowExecutionDetail } from "@/components/workflows/workflow-execution-detail";

type Props = {
  params: Promise<{
    workflowId: string;
    executionId: string;
  }>;
};

export default async function WorkflowExecutionDetailPage({ params }: Props) {
  const { workflowId, executionId } = await params;

  return (
    <WorkflowExecutionDetail
      workflowId={workflowId}
      executionId={executionId}
    />
  );
}
