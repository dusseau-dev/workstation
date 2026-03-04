import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getZenstackPrisma } from '@/lib/db';
import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import { FIND_UNIQUE_WORKFLOW } from '@/lib/constants';

type Props = {
    params: Promise<{ workflowId: string }>;
};

export default async function WorkflowEditorPage(props: Props) {
    const { workflowId } = await props.params;
    const queryClient = getQueryClient();
    const db = await getZenstackPrisma();

    const workflowData = await db.workflow.findUnique(FIND_UNIQUE_WORKFLOW(workflowId));

    queryClient.setQueryData(['workflow-server', workflowId], workflowData);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <WorkflowEditor workflowId={workflowId} initialData={workflowData} />
        </HydrationBoundary>
    );
}
