"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";

const NAV_ITEMS = [
  { label: "My Day", active: true },
  { label: "Projects", active: false },
  { label: "Canvas", active: false },
  { label: "Workflow", active: false },
  { label: "Analyze", active: false },
];

export function OnboardingTopBar({
  subtitle = "Onboarding",
}: {
  subtitle?: string;
}) {
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? "Alex Loomis";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between px-6 z-[200]">
      <div className="flex items-center gap-8">
        {/* Nav tabs */}
        <nav
          className="flex gap-1 p-1"
          style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10 }}
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className="transition-all"
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                color: item.active ? "#1A1A1A" : "#8F8F8F",
                background: item.active ? "#FFFFFF" : "transparent",
                boxShadow: item.active
                  ? "0 1px 3px rgba(0,0,0,0.05)"
                  : "none",
                cursor: "pointer",
                border: "none",
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* User profile — clickable, navigates to settings */}
      <Link
        href="/settings"
        className="flex items-center no-underline"
        style={{ gap: 9 }}
      >
        <div className="text-right">
          <div style={{ fontSize: 12.5, fontWeight: 500, color: "#1A1A1A" }}>
            {displayName}
          </div>
          <div style={{ fontSize: 10.5, color: "#C4C4C4", marginTop: -1 }}>
            {subtitle}
          </div>
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "#222",
            fontSize: 10,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
      </Link>
    </header>
  );
}
