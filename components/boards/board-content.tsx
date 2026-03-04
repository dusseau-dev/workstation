"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFindUniqueBoard } from "@/hooks/model";
import { useUpdateTask, useUpdateColumn } from "@/hooks/model";
import { Skeleton } from "@/components/ui/skeleton";
import type { Board, Column, Task, User } from "@zenstackhq/runtime/models";
import { useModalQuery } from "@/lib/use-modal-query";
import { FIND_UNIQUE_BOARD } from "@/lib/constants";
import { KanbanContent, KanbanOverlay } from "@/components/boards/kanban-content";
import { triggerWorkflow } from "@/lib/actions/trigger-workflow";
import { CommandBar } from "@/components/boards/command-bar";
import { DotGridBackground } from "@/components/onboarding/dot-grid-background";

type TaskWithAssignee = Task & { assignee: User | null };

type BoardWithColumns = Board & {
  columns: (Column & {
    tasks: TaskWithAssignee[];
  })[];
};

type Props = {
  slug: string;
  initialData?: BoardWithColumns | null;
};

export function BoardContent({ slug, initialData }: Props) {
  const [kanbanState, setKanbanState] = useState<
    Record<string, (Task & { assignee: User | null })[]>
  >(() => {
    if (!initialData?.columns) return {};
    return initialData.columns.reduce(
      (acc, column) => {
        acc[column.id] = column.tasks || [];
        return acc;
      },
      {} as Record<string, (Task & { assignee: User | null })[]>
    );
  });

  const { modalState, openAddColumnModal } = useModalQuery();


  const isInitialRender = useRef(true);
  const queryClient = useQueryClient();

  // Track modal states directly
  const isAnyModalOpen = !!modalState?.openModalType;

  const updateTask = useUpdateTask({
    optimisticUpdate: true,
  });

  const updateColumn = useUpdateColumn({
    optimisticUpdate: true,
  });

  const {
    data: board,
    isLoading,
    error,
    refetch,
    queryKey,
  } = useFindUniqueBoard(
    FIND_UNIQUE_BOARD(slug),
    {
      initialData,
      staleTime: 30 * 1000,
      refetchInterval: isAnyModalOpen ? false : 30 * 1000, // Pause syncing when modals are open
      refetchIntervalInBackground: true, // Continue refetching even when tab is not active
      refetchOnWindowFocus: isAnyModalOpen? false : "always", // Pause on focus when modals are open
      refetchOnReconnect: true,
      optimisticUpdate: true,
    }
  );


  // Refetch when board slug changes (but not on initial load)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    void refetch();
  }, [slug, refetch]);

  // Convert board data to kanban format (memoized for performance)
  const serverKanbanData = useMemo(() => {
    if (!board?.columns) return {};

    return board.columns.reduce(
      (acc, column) => {
        acc[column.id] = column.tasks || [];
        return acc;
      },
      {} as Record<string, (Task & { assignee: User | null })[]>
    );
  }, [board?.columns]);

  // Sync server data into local optimistic state during render (avoids extra useEffect cycle)
  const prevServerData = useRef(serverKanbanData);
  if (prevServerData.current !== serverKanbanData) {
    prevServerData.current = serverKanbanData;
    setKanbanState(serverKanbanData);
  }

  // Fire trigger for card move events (fire-and-forget)
  const fireTrigger = useCallback(
    (taskId: string, task: TaskWithAssignee, fromColumnId: string, toColumnId: string) => {
      if (!board?.id) return;
      void triggerWorkflow({
        boardId: board.id,
        eventType: "CARD_MOVED",
        cardId: taskId,
        cardData: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          assigneeId: task.assigneeId,
          columnId: toColumnId,
        },
        fromColumnId,
        toColumnId,
      }).catch((err) => {
        console.warn("Trigger fire failed:", err);
      });
    },
    [board?.id]
  );

  // Handle kanban updates
  const handleKanbanChange = useCallback(
    async (newData: Record<string, (Task & { assignee: User | null })[]>) => {
      // Update local state immediately for smooth UI

      setKanbanState(newData);

      if (!board) return;

      if (!queryKey) {
        console.error("Could not find query key for board");
        return;
      }

      await queryClient.cancelQueries({ queryKey });

      const previousBoard =
        queryClient.getQueryData<BoardWithColumns>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<BoardWithColumns | undefined>(
        queryKey,
        (oldBoard) => {
          if (!oldBoard) {
            return undefined;
          }

          const newBoard: BoardWithColumns = JSON.parse(
            JSON.stringify(oldBoard)
          );

          const newColumns = Object.keys(newData).map((columnId, colIndex) => {
            const column = newBoard.columns.find((c) => c.id === columnId)!;
            // Here we are creating a new column object to avoid mutation
            const newColumn = { ...column, order: colIndex };

            newColumn.tasks = newData[columnId].map((task, taskIndex) => ({
              ...task,
              order: taskIndex,
              columnId: columnId,
            }));
            return newColumn;
          });

          newBoard.columns = newColumns.sort((a, b) => a.order - b.order);
          return newBoard;
        }
      );

      // Create lookup maps for performance
      const columnMap = new Map(board.columns.map((col) => [col.id, col]));
      const taskMap = new Map(
        board.columns.flatMap((col) => col.tasks.map((task) => [task.id, task]))
      );

      // Track all mutations to fire them
      const mutations: Array<Promise<Task | Column | undefined>> = [];

      // Process column order changes
      const newColumnOrder = Object.keys(newData);
      newColumnOrder.forEach((columnId, index) => {
        const currentColumn = columnMap.get(columnId);
        if (currentColumn && currentColumn.order !== index) {
          mutations.push(
            updateColumn.mutateAsync({
              where: { id: columnId },
              data: { order: index },
            })
          );
        }
      });

      // Process task changes — detect column moves for triggers
      const movedTasks: Array<{ taskId: string; task: TaskWithAssignee; fromColumnId: string; toColumnId: string }> = [];
      Object.entries(newData).forEach(([columnId, tasks]) => {
        tasks.forEach((task, index) => {
          const currentTask = taskMap.get(task.id);
          if (currentTask) {
            const needsColumnUpdate = currentTask.columnId !== columnId;
            const needsOrderUpdate = currentTask.order !== index;

            if (needsColumnUpdate || needsOrderUpdate) {
              mutations.push(
                updateTask.mutateAsync({
                  where: { id: task.id },
                  data: { columnId, order: index },
                })
              );
            }

            if (needsColumnUpdate) {
              movedTasks.push({ taskId: task.id, task, fromColumnId: currentTask.columnId, toColumnId: columnId });
            }
          }
        });
      });

      // Execute mutations in parallel to avoid race conditions and improve performance
      try {
        await Promise.all(mutations);
        // Fire CARD_MOVED triggers after DB writes succeed
        movedTasks.forEach(({ taskId, task, fromColumnId, toColumnId }) => {
          fireTrigger(taskId, task, fromColumnId, toColumnId);
        });
      } catch (error) {
        console.error("Error updating kanban data:", error);
        // On failure, revert to the previous state
        if (previousBoard) {
          queryClient.setQueryData(queryKey, previousBoard);
        }
      } finally {
        // Always refetch to ensure data consistency
        await queryClient.invalidateQueries({ queryKey });
      }
    },
    [board, queryClient, queryKey, updateColumn, updateTask, fireTrigger]
  );


  if (isLoading) {
    return (
      <div
        className="relative min-h-screen flex flex-col overflow-hidden"
        style={{ backgroundColor: "#EBEBEB", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        <DotGridBackground />
        <div className="relative z-[1] flex-1 p-10">
          <Skeleton className="h-4 w-32 mb-3" style={{ background: "#DEDEDE" }} />
          <Skeleton className="h-8 w-64 mb-2" style={{ background: "#DEDEDE" }} />
          <Skeleton className="h-4 w-48" style={{ background: "#DEDEDE" }} />
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div
        className="relative min-h-screen flex flex-col"
        style={{ backgroundColor: "#EBEBEB", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
      >
        <div className="relative z-[1] p-10">
          <h1 className="text-[28px] font-medium" style={{ color: "#1A1A1A", letterSpacing: "-0.02em" }}>Board not found</h1>
          <p className="text-sm mt-2" style={{ color: "#8F8F8F" }}>
            {error?.message || "The board you're looking for doesn't exist or you don't have access to it."}
          </p>
        </div>
      </div>
    );
  }

  const statusLabel = board.status?.replace(/_/g, " ") || "Active";

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#EBEBEB", color: "#1A1A1A", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <DotGridBackground />

      <div className="relative z-[1] flex-1 flex flex-col p-10 w-full">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[13px] mb-3" style={{ color: "#8F8F8F" }}>
          <a href="/onboarding" className="no-underline transition-colors hover:opacity-70" style={{ color: "#8F8F8F" }}>Workflows</a>
          <span style={{ color: "#C4C4C4" }}>/</span>
          <span style={{ color: "#1A1A1A" }}>{board.name}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-[28px] font-medium flex items-center gap-3" style={{ letterSpacing: "-0.02em" }}>
            {board.name}
            <span
              className="text-[10px] font-semibold uppercase px-2 py-1 rounded"
              style={{ background: "#E0F2FE", color: "#0369A1", letterSpacing: "0.05em" }}
            >
              {statusLabel}
            </span>
          </h1>
          {board.description && (
            <p className="text-sm mt-1" style={{ color: "#8F8F8F" }}>{board.description}</p>
          )}
        </header>

        {/* Kanban board */}
        {board.columns.length > 0 ? (
          <div className="flex-1" style={{ paddingBottom: 100 }}>
            <KanbanContent
              value={kanbanState}
              onValueChange={handleKanbanChange}
              columns={board.columns}
            >
              <KanbanOverlay />
            </KanbanContent>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm mb-4" style={{ color: "#8F8F8F" }}>
              No columns yet. Add your first column to start organizing tasks.
            </p>
            <button
              onClick={() => openAddColumnModal(board.id)}
              className="text-[13px] font-medium px-3.5 py-2 rounded-md cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: "#1A1A1A", color: "#fff", border: "none" }}
            >
              + Add Column
            </button>
          </div>
        )}
      </div>

      <CommandBar />
    </div>
  );
}
