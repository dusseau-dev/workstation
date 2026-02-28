"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DotGridBackground } from "./dot-grid-background";
import { OnboardingTopBar } from "./onboarding-top-bar";
import { CommandBar } from "./command-bar";

// ---------------------------------------------------------------------------
// Project templates
// ---------------------------------------------------------------------------
const PROJECT_TEMPLATES = [
  {
    name: "Blank Project",
    description: "Start from scratch and build your own custom process.",
  },
  {
    name: "Content Creation",
    description: "Standard discovery, drafting, and multi-stage review pipeline.",
  },
  {
    name: "Asset Pipeline",
    description: "Optimized for ingestion, processing, and tagging workflows.",
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
type Stage = { name: string; tasks: number; color: string };

const DEFAULT_STAGES: Stage[] = [
  { name: "Discovery", tasks: 2, color: "#3B82F6" },
  { name: "Drafting", tasks: 1, color: "#F59E0B" },
  { name: "Review", tasks: 1, color: "#8B5CF6" },
  { name: "Ship", tasks: 0, color: "#10B981" },
];

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
  const [selectedTemplate, setSelectedTemplate] = useState("Blank Project");
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);

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

            <div className="grid grid-cols-3 gap-4">
              {PROJECT_TEMPLATES.map((t) => {
                const isSelected = selectedTemplate === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTemplate(t.name)}
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
              className="flex gap-3"
              style={{
                minHeight: 140,
                padding: 12,
                background: "rgba(0,0,0,0.02)",
                border: "2px dashed #DEDEDE",
                borderRadius: 8,
              }}
            >
              {stages.map((stage, idx) => (
                <div
                  key={stage.name}
                  className="relative flex flex-1 flex-col justify-between"
                  style={{
                    background: "#FFF",
                    border: "1px solid #DEDEDE",
                    borderLeft: `3px solid ${stage.color}`,
                    borderRadius: 6,
                    padding: 12,
                    cursor: "grab",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
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
                    {stage.name}
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
              <div
                className="flex flex-1 items-center justify-center transition-colors"
                style={{
                  border: "1px dashed #DEDEDE",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#8F8F8F",
                  cursor: "pointer",
                }}
              >
                + Add Stage
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3" style={{ marginTop: 40 }}>
            <button
              onClick={() => router.back()}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: "transparent",
                border: "1px solid #DEDEDE",
                color: "#8F8F8F",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // TODO: create project via API then navigate to board
                router.push("/boards");
              }}
              style={{
                padding: "12px 24px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                background: "#1A1A1A",
                border: "1px solid #1A1A1A",
                color: "#FFF",
                cursor: "pointer",
              }}
            >
              Create Project
            </button>
          </div>
        </div>
      </main>

      <CommandBar delay={0} />
    </div>
  );
}
