"use client";

import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  name: string;
  description: string;
  onClick?: () => void;
};

export function TemplateCard({ icon, name, description, onClick }: Props) {
  return (
    <button
      className="flex flex-col text-left transition-colors"
      style={{
        gap: 12,
        background: "#F7F7F7",
        padding: 20,
        cursor: "pointer",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "#FFFFFF")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "#F7F7F7")
      }
      onClick={onClick}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#EBEBEB",
          color: "#8F8F8F",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>
        {name}
      </div>
      <div style={{ fontSize: 12, color: "#8F8F8F", lineHeight: 1.4 }}>
        {description}
      </div>
    </button>
  );
}
