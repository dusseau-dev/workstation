"use client";

import React from "react";
import { GripVertical, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
    return <div className="shrink-0" style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981", marginTop: 4 }} />;
  }
  const isRecent = (Date.now() - new Date(task.updatedAt).getTime()) < 86400000;
  if (isRecent) {
    return <div className="shrink-0" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B82F6", boxShadow: "0 0 8px rgba(59, 130, 246, 0.4)", marginTop: 4 }} />;
  }
  return <div className="shrink-0" style={{ width: 8, height: 8, borderRadius: "50%", background: "#C4C4C4", marginTop: 4 }} />;
}

function DueDateLabel({ date }: { date: Date | string }) {
  const d = new Date(date);
  if (isToday(d)) {
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color: "#3B82F6" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        Due Today
      </span>
    );
  }
  if (isTomorrow(d)) {
    return (
      <span className="flex items-center gap-1 text-[11px]" style={{ color: "#8F8F8F" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        Tomorrow
      </span>
    );
  }
  if (isPast(startOfDay(d))) {
    return <span className="text-[11px]" style={{ color: "#EF4444" }}>Overdue</span>;
  }
  return <span className="text-[11px]" style={{ color: "#C4C4C4" }}>{format(d, "MMM d")}</span>;
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
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-2">
        <Kanban.ColumnHandle asChild>
          <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing">
            <span
              className="text-[11px] font-semibold uppercase flex items-center gap-2"
              style={{ color: "#C4C4C4", letterSpacing: "0.06em" }}
            >
              {column.title}
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] min-w-[18px] text-center"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                {column.tasks?.length || 0}
              </span>
            </span>
          </div>
        </Kanban.ColumnHandle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center h-6 w-6 rounded cursor-pointer"
              style={{ background: "transparent", border: "none", color: "#C4C4C4" }}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
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

      {/* Task cards */}
      <div className="flex flex-col gap-3">
        {column.tasks.map((task) => {
          const isRecent = (Date.now() - new Date(task.updatedAt).getTime()) < 86400000;
          const isActive = isRecent && !task.completedAt;

          return (
            <Kanban.Item key={task.id} value={task.id} asChild>
              <div
                className="group rounded-lg p-4 flex flex-col gap-3 cursor-pointer transition-all"
                style={{
                  background: "#F7F7F7",
                  border: isActive ? "1px solid #3B82F6" : "1px solid #DEDEDE",
                  boxShadow: isActive
                    ? "0 0 0 1px #3B82F6, 0 4px 12px rgba(59, 130, 246, 0.1)"
                    : "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
                }}
                onClick={() => openEditTaskModal(column.id, task.id)}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#BFBFBF";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#F7F7F7";
                    e.currentTarget.style.borderColor = "#DEDEDE";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)";
                  }
                }}
              >
                {/* Title + status dot */}
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2 flex-1">
                    <Kanban.ItemHandle asChild>
                      <button
                        className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
                        style={{ background: "none", border: "none", padding: 0, color: "#C4C4C4" }}
                      >
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    </Kanban.ItemHandle>
                    <span className="text-sm font-medium leading-snug flex-1 text-left" style={{ color: "#1A1A1A" }}>
                      {task.title}
                    </span>
                  </div>
                  <StatusDot task={task} isLastColumn={isLastColumn} />
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: "#8F8F8F" }}>
                  {task.dueDate && (
                    <DueDateLabel date={task.dueDate} />
                  )}
                  {task.priority !== "MEDIUM" && (
                    <span className="capitalize">{task.priority.toLowerCase()}</span>
                  )}
                </div>

                {/* Footer: assignee + date */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: "1px solid rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-1.5">
                    {task.assignee ? (
                      <>
                        <div
                          className="flex items-center justify-center rounded-full text-[9px] font-semibold shrink-0"
                          style={{ width: 20, height: 20, background: "#333", color: "#fff", border: "1.5px solid #fff" }}
                        >
                          {(task.assignee.name ?? "U").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[11px] truncate max-w-[100px]" style={{ color: "#8F8F8F" }}>
                          {task.assignee.name?.split(" ")[0] || "User"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px]" style={{ color: "#C4C4C4" }}>Unassigned</span>
                    )}
                  </div>
                  {task.dueDate ? null : (
                    <span className="text-[11px]" style={{ color: "#C4C4C4" }}>
                      {format(task.createdAt, "MMM d")}
                    </span>
                  )}
                </div>
              </div>
            </Kanban.Item>
          );
        })}
      </div>

      {/* Add Task button */}
      <button
        onClick={handleAddTaskClick}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs cursor-pointer transition-all"
        style={{
          border: "1px dashed #DEDEDE",
          background: "transparent",
          color: "#C4C4C4",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,0,0,0.02)";
          e.currentTarget.style.color = "#8F8F8F";
          e.currentTarget.style.borderStyle = "solid";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#C4C4C4";
          e.currentTarget.style.borderStyle = "dashed";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10" /></svg>
        Add Task
      </button>
    </Kanban.Column>
  );
});
