export const FIND_UNIQUE_BOARD =
    (boardId: string) => ({
        where: { id: boardId },
        include: {
            columns: {
                include: {
                    tasks: {
                        include: {
                            assignee: true,
                        },
                        orderBy: { order: "asc" as const },
                    },
                },
                orderBy: { order: "asc" as const },
            },
        },
    });

export const FIND_UNIQUE_WORKFLOW =
    (workflowId: string) => ({
        where: { id: workflowId },
        include: {
            triggers: true,
            executions: {
                orderBy: { createdAt: "desc" as const },
                take: 10,
            },
        },
    });
