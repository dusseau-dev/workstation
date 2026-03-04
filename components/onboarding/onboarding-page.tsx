"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useFindManyBoard } from "@/hooks/model";
import { useOrgChangeCallback } from "@/hooks/use-org-change-callback";
import { useModalQuery } from "@/lib/use-modal-query";
import { DotGridBackground } from "./dot-grid-background";
import { OnboardingTopBar, type NavTab } from "./onboarding-top-bar";
import { WelcomeSection } from "./welcome-section";
import { TemplateGrid } from "./template-grid";
import { CommandBar } from "./command-bar";
import type { Board, Column, Task, User } from "@zenstackhq/runtime/models";

type TaskWithAssignee = Task & { assignee: User | null };
type ColumnWithTasks = Column & { tasks: TaskWithAssignee[] };
type BoardWithColumns = Board & { columns: ColumnWithTasks[] };

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
  if (board.status === "IN_PROGRESS") return { label: "IN PROGRESS", active: true };
  if (board.status === "COMPLETED") return { label: "COMPLETED", active: false };
  if (board.status === "ON_HOLD") return { label: "ON HOLD", active: false };
  if (board.status === "ARCHIVED") return { label: "ARCHIVED", active: false };
  const totalTasks = board.columns.reduce((sum, col) => sum + col.tasks.length, 0);
  if (totalTasks === 0) return { label: "EMPTY", active: false };
  const hasRecent = board.columns.some((col) =>
    col.tasks.some((t) => Date.now() - new Date(t.updatedAt).getTime() < 86400000)
  );
  return hasRecent ? { label: "IN PROGRESS", active: true } : { label: "IDLE", active: false };
}

function WorkflowRow({ board }: { board: BoardWithColumns }) {
  const [expanded, setExpanded] = useState(false);
  const progress = getProgress(board);
  const status = getStatusLabel(board);

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: "#F7F7F7",
        border: "1px solid #DEDEDE",
      }}
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-6 px-6 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <a
          href={`/boards/${board.id}`}
          className="text-[15px] font-semibold min-w-[180px] no-underline hover:opacity-70 transition-opacity"
          style={{ color: "#1A1A1A" }}
          onClick={(e) => e.stopPropagation()}
        >
          {board.name}
        </a>

        <span
          className="text-[10px] font-semibold tracking-wider px-2 py-1 rounded"
          style={{
            background: status.active ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.04)",
            color: status.active ? "#1A1A1A" : "#8F8F8F",
          }}
        >
          {status.label}
        </span>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-3">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: "#DEDEDE" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "#1A1A1A" }}
            />
          </div>
          <span
            className="text-[11px] font-semibold min-w-[32px] text-right"
            style={{ color: "#8F8F8F", fontVariantNumeric: "tabular-nums" }}
          >
            {progress}%
          </span>
        </div>

        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className="transition-transform duration-300"
          style={{
            color: "#C4C4C4",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Expandable pipeline detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid #DEDEDE" }}>
          <div className="flex gap-4 p-6 overflow-x-auto">
            {board.columns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-[200px] rounded-lg p-3 flex flex-col gap-2.5"
                style={{ background: "rgba(0,0,0,0.03)" }}
              >
                <div
                  className="flex justify-between text-[11px] font-semibold uppercase mb-1"
                  style={{ color: "#8F8F8F", letterSpacing: "0.06em" }}
                >
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
                      className="rounded-md p-3 flex flex-col gap-2"
                      style={{
                        background: "#FFFFFF",
                        border: `1px solid ${!isCompleted && isRecent ? "#1A1A1A" : "#DEDEDE"}`,
                        boxShadow: !isCompleted && isRecent
                          ? "0 2px 8px rgba(0,0,0,0.08)"
                          : "0 1px 2px rgba(0,0,0,0.02)",
                        opacity: isCompleted ? 0.7 : 1,
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-[13px] font-medium">
                        <div
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{
                            background: isCompleted
                              ? "#10b981"
                              : isRecent
                                ? "#3b82f6"
                                : "#C4C4C4",
                            animation: !isCompleted && isRecent ? "pulse 2s infinite" : "none",
                          }}
                        />
                        <span style={{ color: "#1A1A1A" }}>{task.title}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5" style={{ background: "rgba(0,0,0,0.04)", color: "#8F8F8F", width: "fit-content" }}>
                        {task.assignee ? (
                          <>
                            <span
                              className="flex items-center justify-center rounded-full text-[7px] font-semibold"
                              style={{
                                width: 14,
                                height: 14,
                                background: "#222",
                                color: "#fff",
                              }}
                            >
                              {(task.assignee.name ?? "U").charAt(0).toUpperCase()}
                            </span>
                            <span>{task.assignee.name?.split(" ")[0] || "User"}</span>
                          </>
                        ) : (
                          <span>Unassigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OnboardingPage() {
  const { data: session } = useSession();
  const firstName = (session?.user?.name ?? "there").split(" ")[0];
  const { data: boards, refetch } = useFindManyBoard(
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
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    }
  );

  const { openAddBoardModal } = useModalQuery();

  useOrgChangeCallback(() => {
    void refetch();
  });

  const hasProjects = boards && boards.length > 0;
  const defaultTab: NavTab = hasProjects ? "Projects" : "My Day";
  const [activeTab, setActiveTab] = useState<NavTab | undefined>(undefined);
  const resolvedTab = activeTab ?? defaultTab;

  return (
    <div
      className="relative flex h-svh flex-col overflow-hidden"
      style={{
        backgroundColor: "#EBEBEB",
        color: "#1A1A1A",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <DotGridBackground />

      <OnboardingTopBar activeTab={resolvedTab} onTabChange={setActiveTab} />

      <main className="relative z-[1] flex flex-1 overflow-y-auto">
        {resolvedTab === "My Day" ? (
          <div className="flex w-[540px] flex-col gap-6 mx-auto my-auto">
            <WelcomeSection userName={firstName} />
            <TemplateGrid />
          </div>
        ) : resolvedTab === "Projects" ? (
          <div className="w-full max-w-7xl mx-auto px-6 py-8 lg:px-12">
            <button
              onClick={openAddBoardModal}
              className="mb-4 text-[13px] font-medium transition-opacity hover:opacity-60 cursor-pointer"
              style={{
                color: "#B0B0B0",
                background: "none",
                border: "none",
                padding: 0,
              }}
            >
              + Add project
            </button>

            {hasProjects ? (
              <div className="flex flex-col gap-3">
                {(boards as BoardWithColumns[]).map((board) => (
                  <WorkflowRow key={board.id} board={board} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: "#8F8F8F" }}>
                  No projects yet. Click &quot;+ Add project&quot; to get started.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center mx-auto my-auto">
            <h2 className="text-2xl font-medium" style={{ color: "#1A1A1A" }}>
              {resolvedTab}
            </h2>
            <p className="text-sm" style={{ color: "#8F8F8F" }}>
              This section is coming soon.
            </p>
          </div>
        )}
      </main>

      <CommandBar />
    </div>
  );
}
