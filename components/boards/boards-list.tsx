"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOrgChangeCallback } from "@/hooks/use-org-change-callback";
import type { Board, Column, Task, User } from "@zenstackhq/runtime/models";
import { useFindManyBoard } from "@/hooks/model";
import { BoardListSkeleton } from "@/components/boards/board-list-skeleton";
import { ActionHeading } from "@/components/boards/action-heading";
import { useModalQuery } from "@/lib/use-modal-query";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@daveyplate/better-auth-ui";

type TaskWithAssignee = Task & { assignee: User | null };
type ColumnWithTasks = Column & { tasks: TaskWithAssignee[] };
type BoardWithColumns = Board & { columns: ColumnWithTasks[] };

type Props = {
  initialData?: BoardWithColumns[] | null;
};

function getProgress(board: BoardWithColumns): number {
  const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  if (totalTasks === 0) return 0;
  const completedTasks = board.columns.reduce(
    (sum, col) => sum + col.tasks.filter((t) => t.completedAt != null).length,
    0
  );
  return Math.round((completedTasks / totalTasks) * 100);
}

function getStatusLabel(board: BoardWithColumns): { label: string; active: boolean } {
  if (board.status === "IN_PROGRESS") return { label: "In Progress", active: true };
  if (board.status === "COMPLETED") return { label: "Completed", active: false };
  if (board.status === "ON_HOLD") return { label: "On Hold", active: false };
  if (board.status === "ARCHIVED") return { label: "Archived", active: false };

  // Derive from tasks if status is ACTIVE/default
  const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  if (totalTasks === 0) return { label: "Empty", active: false };
  const hasRecent = board.columns.some((col) =>
    col.tasks.some((t) => Date.now() - new Date(t.updatedAt).getTime() < 86400000)
  );
  return hasRecent ? { label: "In Progress", active: true } : { label: "Idle", active: false };
}

function WorkflowCard({ board }: { board: BoardWithColumns }) {
  const [expanded, setExpanded] = useState(false);
  const progress = getProgress(board);
  const status = getStatusLabel(board);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card transition-all duration-300",
        "shadow-[0_2px_8px_rgba(0,0,0,0.03),0_1px_2px_rgba(0,0,0,0.02)]",
        "hover:shadow-[0_12px_24px_rgba(0,0,0,0.06),0_4px_8px_rgba(0,0,0,0.04)] hover:bg-popover"
      )}
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-6 px-6 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <Link
          href={`/boards/${board.id}`}
          className="text-[15px] font-semibold min-w-[180px] hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {board.name}
        </Link>

        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded",
            status.active
              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          {status.label}
        </span>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground min-w-[32px] text-right tabular-nums">
            {progress}%
          </span>
        </div>

        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground/40 transition-transform duration-300",
            expanded && "rotate-180"
          )}
        />
      </div>

      {/* Expandable pipeline detail */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "border-t" : "h-0"
        )}
      >
        {expanded && (
          <div className="flex gap-4 p-6 overflow-x-auto">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-[200px] bg-muted/30 rounded-lg p-3 flex flex-col gap-2.5"
              >
                <div className="flex justify-between text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground mb-1">
                  <span>{column.title}</span>
                  <span>{column.tasks.length}</span>
                </div>

                {column.tasks.map((task) => {
                  const isCompleted = task.completedAt != null;
                  const isRecent =
                    Date.now() - new Date(task.updatedAt).getTime() < 86400000;

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "bg-popover border rounded-md p-3 flex flex-col gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                        isCompleted && "opacity-70 bg-card",
                        !isCompleted && isRecent && "border-foreground shadow-md"
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-[13px] font-medium">
                        <div
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            isCompleted
                              ? "bg-emerald-500"
                              : isRecent
                                ? "bg-blue-500 animate-pulse"
                                : "bg-muted-foreground/30"
                          )}
                        />
                        {task.title}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-1 text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                          {task.assignee ? (
                            <>
                              <UserAvatar
                                user={task.assignee}
                                size="sm"
                                className="h-3.5 w-3.5 text-[7px]"
                              />
                              <span>{task.assignee.name?.split(" ")[0] || "User"}</span>
                            </>
                          ) : (
                            <span>Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BoardsList({ initialData }: Props) {
  const {
    data: boards,
    refetch,
    isLoading,
    isFetching,
  } = useFindManyBoard(
    {
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
    },
    {
      initialData,
      staleTime: 60 * 1000,
      refetchInterval: 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      optimisticUpdate: true,
    }
  );

  const { openAddBoardModal } = useModalQuery();

  useOrgChangeCallback(() => {
    void refetch();
  });

  return (
    <div className="dot-grid-bg min-h-[calc(100svh-4rem)]">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
        <ActionHeading
          title="Boards"
          description="Automated operational pipelines across your workspace."
          isFetching={isFetching}
          isLoading={isLoading}
        >
          <Button disabled={isLoading} onClick={openAddBoardModal}>
            <Plus className="mr-2 h-4 w-4" />
            New Board
          </Button>
        </ActionHeading>

        {isLoading ? (
          <BoardListSkeleton />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {(boards as BoardWithColumns[] | undefined)?.map((board) => (
                <WorkflowCard key={board.id} board={board} />
              ))}
            </div>

            {boards?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No boards found. Create your first board to get started!
                </p>
                <Button onClick={openAddBoardModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Board
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
