import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getZenstackPrisma } from '@/lib/db';
import { WorkflowsList } from '@/components/workflows/workflows-list';

export default async function WorkflowsPage() {
    const queryClient = getQueryClient();
    const db = await getZenstackPrisma();

    const workflowsData = await db.workflow.findMany({
        orderBy: { updatedAt: "desc" },
    });

    queryClient.setQueryData(['workflows-server'], workflowsData);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <WorkflowsList initialData={workflowsData} />
        </HydrationBoundary>
    );
}
