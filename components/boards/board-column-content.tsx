"use client";

import React from "react";
import { GripVertical, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as Kanban from "@/components/ui/kanban";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Column, Task, User } from "@zenstackhq/runtime/models";
import { useModalQuery } from "@/lib/use-modal-query";
import { UserAvatar } from "@daveyplate/better-auth-ui";
import { format, isToday, isTomorrow, isPast, startOfDay } from "date-fns";

type ColumnWithTasks = Column & {
  tasks: (Task & {
    assignee: User | null;
  })[];
};

type Props = {
  column: ColumnWithTasks;
  isLastColumn?: boolean;
};

function StatusDot({ task, isLastColumn }: { task: Task; isLastColumn: boolean }) {
  const isCompleted = task.completedAt != null || isLastColumn;

  if (isCompleted) {
    return <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1" />;
  }

  const isRecent = (Date.now() - new Date(task.updatedAt).getTime()) < 86400000;

  if (isRecent) {
    return (
      <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)] shrink-0 mt-1" />
    );
  }

  return <div className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0 mt-1" />;
}

function DueDateLabel({ date }: { date: Date | string }) {
  const d = new Date(date);
  if (isToday(d)) {
    return <span className="text-[10px] font-medium text-amber-600 tabular-nums">Due Today</span>;
  }
  if (isTomorrow(d)) {
    return <span className="text-[10px] font-medium text-muted-foreground tabular-nums">Tomorrow</span>;
  }
  if (isPast(startOfDay(d))) {
    return <span className="text-[10px] font-medium text-red-500 tabular-nums">Overdue</span>;
  }
  return <span className="text-[10px] text-muted-foreground/60 tabular-nums">{format(d, "MMM d")}</span>;
}

export const BoardColumnContent = React.memo(function BoardColumnContent({
  column,
  isLastColumn = false,
}: Props) {
  const {
    openAddTaskModal,
    openEditColumnModal,
    openDeleteColumnModal,
    openEditTaskModal,
  } = useModalQuery();

  const handleAddTaskClick = () => {
    openAddTaskModal(column.id);
  };

  return (
    <Kanban.Column
      key={column.id}
      value={column.id}
      className="bg-transparent border-0 p-0 gap-3"
    >
      <div className="flex items-center justify-between px-1 pb-1">
        <Kanban.ColumnHandle asChild>
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {column.title}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/60 bg-muted/80 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {column.tasks?.length || 0}
            </span>
          </div>
        </Kanban.ColumnHandle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditColumnModal(column.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Column
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddTaskClick}>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => openDeleteColumnModal(column.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        {column.tasks.map((task) => (
          <Kanban.Item key={task.id} value={task.id} asChild>
            <div
              className="group rounded-lg border bg-card p-4 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-border/80 hover:-translate-y-0.5"
              onClick={() => openEditTaskModal(column.id, task.id)}
            >
              <div className="flex flex-col gap-3">
                {/* Title + status dot */}
                <div className="flex items-start gap-2">
                  <Kanban.ItemHandle asChild>
                    <button className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </Kanban.ItemHandle>
                  <span className="text-sm font-medium leading-snug flex-1 text-left">
                    {task.title}
                  </span>
                  <StatusDot task={task} isLastColumn={isLastColumn} />
                </div>

                {/* Description preview */}
                {task.description && (
                  <p className="text-[11px] text-muted-foreground/70 line-clamp-1 leading-relaxed">
                    {task.description.replace(/[#*_`>\-\[\]()]/g, "").trim()}
                  </p>
                )}

                {/* Metadata: show priority if not MEDIUM */}
                {task.priority !== "MEDIUM" && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="capitalize">{task.priority.toLowerCase()} priority</span>
                  </div>
                )}

                {/* Footer: assignee + date */}
                <div className="flex items-center justify-between pt-3 border-t border-border/40">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <UserAvatar user={task.assignee} size="sm" className="h-5 w-5 text-[9px]" />
                      <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">
                        {task.assignee.name || task.assignee.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Unassigned</span>
                  )}
                  {task.dueDate ? (
                    <DueDateLabel date={task.dueDate} />
                  ) : (
                    <time className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {format(task.createdAt, "MMM d")}
                    </time>
                  )}
                </div>
              </div>
            </div>
          </Kanban.Item>
        ))}
      </div>

      {/* Persistent Add Task button */}
      <button
        onClick={handleAddTaskClick}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/20 py-2.5 text-xs text-muted-foreground/60 hover:border-muted-foreground/40 hover:text-muted-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Task
      </button>
    </Kanban.Column>
  );
});
