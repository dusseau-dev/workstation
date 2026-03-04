"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { TemplateCard } from "./template-card";

const TEMPLATES = [
  {
    name: "Projects",
    description:
      "Pipeline and deal management with automated workflows and risk tracking.",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h12M2 8h12M2 4h12" />
      </svg>
    ),
  },
  {
    name: "Workflows",
    description:
      "Build automated underwriting, servicing, and compliance processes.",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2v12M2 8h12" />
      </svg>
    ),
  },
  {
    name: "Reports",
    description:
      "Generate lending metrics and portfolio analytics using natural language.",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="12" height="12" rx="2" />
      </svg>
    ),
  },
  {
    name: "Canvas",
    description:
      "Flexible workspace for deal structuring and strategic planning.",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="8" cy="8" r="6" />
      </svg>
    ),
  },
];

const TEMPLATE_ROUTES: Record<string, string> = {
  Projects: "/projects/new",
  Workflows: "/projects/new",
  Reports: "/projects/new",
  Canvas: "/projects/new",
};

export function TemplateGrid() {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2, duration: 0.6 }}
      className="overflow-hidden"
      style={{
        background: "#F7F7F7",
        border: "1px solid #DEDEDE",
        borderRadius: 12,
        boxShadow:
          "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
      }}
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #DEDEDE",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#8F8F8F",
          }}
        >
          Quick Start Templates
        </span>
      </div>
      <div
        className="grid grid-cols-2"
        style={{ gap: 1, background: "#DEDEDE" }}
      >
        {TEMPLATES.map((t) => (
          <TemplateCard
            key={t.name}
            {...t}
            onClick={() => {
              const route = TEMPLATE_ROUTES[t.name];
              if (route) router.push(route);
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
