import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { getZenstackPrisma } from '@/lib/db';
import { BoardsList } from '@/components/boards/boards-list';

export default async function BoardsPage() {
    const queryClient = getQueryClient();
    const db = await getZenstackPrisma();

    // Include columns + tasks for progress calculation and pipeline view
    const boardsData = await db.board.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            columns: {
                include: {
                    tasks: {
                        include: { assignee: true },
                        orderBy: { order: "asc" },
                    },
                },
                orderBy: { order: "asc" },
            },
        },
    });

    queryClient.setQueryData(['boards-server'], boardsData);

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <BoardsList initialData={boardsData} />
        </HydrationBoundary>
    );
}
