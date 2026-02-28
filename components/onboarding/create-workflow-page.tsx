"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateBoard, useCreateManyColumn } from "@/hooks/model";
import { DotGridBackground } from "./dot-grid-background";
import { OnboardingTopBar } from "./onboarding-top-bar";

// ---------------------------------------------------------------------------
// Project templates
// ---------------------------------------------------------------------------
const PROJECT_TEMPLATES = [
  {
    name: "Deal Pipeline Projects",
    description:
      "Track loans from application through closing with custom statuses.",
    stages: [
      { name: "Lead", desc: "Initial inquiry or referral received", tasks: 0, color: "#8F8F8F" },
      { name: "Pre-Qualification", desc: "Basic eligibility screening", tasks: 0, color: "#06B6D4" },
      { name: "Application", desc: "Formal application submitted", tasks: 0, color: "#3B82F6" },
      { name: "Underwriting", desc: "Full financial analysis and risk assessment", tasks: 0, color: "#F59E0B" },
      { name: "Credit Committee", desc: "Internal approval review", tasks: 0, color: "#8B5CF6" },
      { name: "Conditional Approval", desc: "Approved pending final conditions", tasks: 0, color: "#EC4899" },
      { name: "Closing", desc: "Loan docs prepared and executed", tasks: 0, color: "#F59E0B" },
      { name: "Funded", desc: "Capital deployed", tasks: 0, color: "#10B981" },
      { name: "Declined", desc: "Not approved (archive)", tasks: 0, color: "#EF4444" },
    ],
  },
  {
    name: "Underwriting Projects",
    description:
      "Manage individual deal underwriting with document checklists, financial analysis, and approval workflows.",
    stages: [
      { name: "Document Collection", desc: "Gathering bank statements, tax returns, financials", tasks: 0, color: "#8F8F8F" },
      { name: "Data Entry", desc: "Inputting financials into underwriting system", tasks: 0, color: "#06B6D4" },
      { name: "Analysis", desc: "Cash flow analysis, debt service calculations", tasks: 0, color: "#3B82F6" },
      { name: "Risk Assessment", desc: "Credit scoring, covenant review", tasks: 0, color: "#F59E0B" },
      { name: "Structuring", desc: "Terms, pricing, guarantees finalized", tasks: 0, color: "#8B5CF6" },
      { name: "Internal Review", desc: "Peer or senior underwriter review", tasks: 0, color: "#EC4899" },
      { name: "Committee Ready", desc: "Package prepared for approval", tasks: 0, color: "#F59E0B" },
      { name: "Approved/Declined", desc: "Final decision", tasks: 0, color: "#10B981" },
    ],
  },
  {
    name: "Portfolio Management",
    description:
      "Monitor performing loans, covenant compliance, and collection activities.",
    stages: [
      { name: "Performing", desc: "Current on payments, no issues", tasks: 0, color: "#10B981" },
      { name: "Monitoring", desc: "Watchlist, early warning signs", tasks: 0, color: "#06B6D4" },
      { name: "Past Due", desc: "Payment delinquency (15-30 days)", tasks: 0, color: "#F59E0B" },
      { name: "Collection", desc: "Active collection efforts (30+ days)", tasks: 0, color: "#EF4444" },
      { name: "Restructure", desc: "Workout or modification in process", tasks: 0, color: "#8B5CF6" },
      { name: "Legal", desc: "Foreclosure or litigation initiated", tasks: 0, color: "#EC4899" },
      { name: "Charged Off", desc: "Loss recognized", tasks: 0, color: "#8F8F8F" },
      { name: "Resolved", desc: "Paid off or settled", tasks: 0, color: "#10B981" },
    ],
  },
  {
    name: "Operational Initiatives",
    description:
      "Track process improvements, system implementations, or compliance projects.",
    stages: [
      { name: "Backlog", desc: "Identified but not prioritized", tasks: 0, color: "#8F8F8F" },
      { name: "Planning", desc: "Scoping and resource allocation", tasks: 0, color: "#06B6D4" },
      { name: "In Progress", desc: "Active development/implementation", tasks: 0, color: "#3B82F6" },
      { name: "Testing", desc: "QA or pilot phase", tasks: 0, color: "#F59E0B" },
      { name: "Review", desc: "Stakeholder feedback", tasks: 0, color: "#8B5CF6" },
      { name: "Completed", desc: "Live and operational", tasks: 0, color: "#10B981" },
      { name: "On Hold", desc: "Paused/blocked", tasks: 0, color: "#EF4444" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Stage colors
// ---------------------------------------------------------------------------
const STAGE_COLORS = [
  "#8F8F8F", // gray (default)
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
];

// ---------------------------------------------------------------------------
// Default stages
// ---------------------------------------------------------------------------
type Stage = { name: string; desc?: string; tasks: number; color: string };

const DEFAULT_STAGES: Stage[] = PROJECT_TEMPLATES[0].stages;

function DragHandle() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ color: "#C4C4C4", cursor: "grab" }}>
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="12" cy="8" r="1.5" />
      <circle cx="4" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// CreateWorkflowPage (Project creation)
// ---------------------------------------------------------------------------
function ColorPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: -4,
        left: -4,
        zIndex: 10,
        display: "flex",
        gap: 4,
        padding: 6,
        background: "#FFF",
        border: "1px solid #DEDEDE",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {STAGE_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => {
            onSelect(c);
            onClose();
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: c,
            border: c === current ? "2px solid #1A1A1A" : "2px solid transparent",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

export function CreateWorkflowPage() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("Deal Pipeline Projects");
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

  const { mutateAsync: createBoard, isPending: isCreatingBoard } =
    useCreateBoard({ optimisticUpdate: true });
  const { mutateAsync: createManyColumns, isPending: isCreatingColumns } =
    useCreateManyColumn({ optimisticUpdate: true });

  const isPending = isCreatingBoard || isCreatingColumns;

  function selectTemplate(name: string) {
    setSelectedTemplate(name);
    const tpl = PROJECT_TEMPLATES.find((t) => t.name === name);
    if (tpl?.stages) setStages(tpl.stages);
  }

  function addStage() {
    setStages((prev) => [
      ...prev,
      { name: "New Stage", desc: "", tasks: 0, color: "#8F8F8F" },
    ]);
  }

  async function handleCreateProject() {
    const name = projectName.trim() || selectedTemplate;
    try {
      const board = await createBoard({ data: { name } });
      if (board?.id) {
        const columns = stages.map((s, i) => ({
          title: s.name,
          order: i,
          boardId: board.id,
        }));
        await createManyColumns({ data: columns });
        toast.success("Project created");
        router.push(`/boards/${board.id}`);
      }
    } catch {
      toast.error("Failed to create project");
    }
  }

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

      <OnboardingTopBar subtitle="New Project" />

      <main
        className="relative z-[1] flex-1 overflow-y-auto pb-24"
        style={{ padding: "32px 64px" }}
      >
        <div className="mx-auto w-full" style={{ maxWidth: 900 }}>
          {/* Header */}
          <header style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 32, fontWeight: 500, letterSpacing: "-0.03em", marginBottom: 8 }}>
              Create New Project
            </h1>
            <p style={{ fontSize: 15, color: "#8F8F8F" }}>
              Define the stages and logic for your automated pipeline.
            </p>
          </header>

          {/* General + Templates card */}
          <div
            style={{
              background: "#F7F7F7",
              border: "1px solid #DEDEDE",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
              padding: 32,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#C4C4C4",
                marginBottom: 20,
              }}
            >
              General
            </div>

            <div style={{ marginBottom: 32 }}>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Give your project a name..."
                className="w-full outline-none"
                style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: "2px solid #DEDEDE",
                  fontSize: 24,
                  fontWeight: 500,
                  padding: "8px 0",
                  color: "#1A1A1A",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#1A1A1A")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#DEDEDE")}
              />
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#C4C4C4",
                marginBottom: 20,
              }}
            >
              Templates
            </div>

            <div className="grid grid-cols-2 gap-4">
              {PROJECT_TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => selectTemplate(t.name)}
                    className="text-left transition-all"
                    style={{
                      background: "#FFF",
                      border: isSelected ? "2px solid #1A1A1A" : "1px solid #DEDEDE",
                      borderRadius: 8,
                      padding: isSelected ? 15 : 16,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#8F8F8F", lineHeight: 1.4 }}>
                      {t.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage Builder card */}
          <div
            style={{
              background: "#F7F7F7",
              border: "1px solid #DEDEDE",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
              padding: 32,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "#C4C4C4",
                marginBottom: 20,
              }}
            >
              Stage Builder
            </div>
            <p style={{ fontSize: 13, color: "#8F8F8F", marginBottom: 20 }}>
              Drag to reorder or click to edit stage parameters.
            </p>

            <div
              style={{
                overflowX: "auto",
                padding: 12,
                background: "rgba(0,0,0,0.02)",
                border: "2px dashed #DEDEDE",
                borderRadius: 8,
              }}
            >
              <div
                className="flex gap-3"
                style={{ minWidth: "min-content" }}
              >
                {stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="relative flex flex-col justify-between"
                    style={{
                      width: 160,
                      minWidth: 160,
                      background: "#FFF",
                      border: "1px solid #DEDEDE",
                      borderLeft: `3px solid ${stage.color}`,
                      borderRadius: 6,
                      padding: 12,
                      cursor: "grab",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2" style={{ fontSize: 13, fontWeight: 600 }}>
                        <DragHandle />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorPickerIdx(colorPickerIdx === idx ? null : idx);
                          }}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: stage.color,
                            border: "1px solid rgba(0,0,0,0.1)",
                            cursor: "pointer",
                            padding: 0,
                            flexShrink: 0,
                          }}
                          title="Change color"
                        />
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) =>
                            setStages((prev) =>
                              prev.map((s, i) =>
                                i === idx ? { ...s, name: e.target.value } : s
                              )
                            )
                          }
                          className="min-w-0 flex-1 outline-none"
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#1A1A1A",
                            fontFamily: "inherit",
                            padding: 0,
                          }}
                        />
                      </div>
                      {colorPickerIdx === idx && (
                        <ColorPicker
                          current={stage.color}
                          onSelect={(color) => {
                            setStages((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, color } : s))
                            );
                          }}
                          onClose={() => setColorPickerIdx(null)}
                        />
                      )}
                      <input
                        type="text"
                        value={stage.desc ?? ""}
                        onChange={(e) =>
                          setStages((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, desc: e.target.value } : s
                            )
                          )
                        }
                        placeholder="Add description..."
                        className="w-full outline-none"
                        style={{
                          background: "transparent",
                          border: "none",
                          fontSize: 11,
                          color: "#8F8F8F",
                          lineHeight: 1.4,
                          marginTop: 6,
                          fontFamily: "inherit",
                          padding: 0,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: "rgba(0,0,0,0.05)",
                        color: "#8F8F8F",
                        fontSize: 11,
                        fontWeight: 600,
                        alignSelf: "flex-start",
                        marginTop: 12,
                      }}
                    >
                      {stage.tasks} Task{stage.tasks !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}

                {/* Add stage */}
                <button
                  onClick={addStage}
                  className="flex items-center justify-center"
                  style={{
                    width: 120,
                    minWidth: 120,
                    border: "1px dashed #DEDEDE",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#8F8F8F",
                    cursor: "pointer",
                    background: "transparent",
                  }}
                >
                  + Add Stage
                </button>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3" style={{ marginTop: 40 }}>
            <button
              onClick={() => router.back()}
              disabled={isPending}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid #DEDEDE",
                color: "#8F8F8F",
                cursor: isPending ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreateProject}
              disabled={isPending}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: isPending ? "#8F8F8F" : "#1A1A1A",
                border: isPending ? "1px solid #8F8F8F" : "1px solid #1A1A1A",
                color: "#FFF",
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
              }}
            >
              {isPending ? "Creating..." : "Create Project"}
            </button>
          </div>
        </div>
      </main>

      {/* Floating chat icon */}
      <button
        onClick={() => {
          // TODO: open chat panel
        }}
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 100,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: "#1A1A1A",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
        title="Chat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
