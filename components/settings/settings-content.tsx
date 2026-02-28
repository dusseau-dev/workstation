"use client";

import { useState } from "react";
import { AccountTab } from "./account-tab";

const SUB_TABS = ["Account", "Security", "Billing"] as const;
type SubTab = (typeof SUB_TABS)[number];

export function SettingsContent() {
  const [activeTab, setActiveTab] = useState<SubTab>("Account");

  return (
    <div className="mx-auto w-full max-w-[800px]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: "-0.01em",
          }}
        >
          Settings
        </h1>

        {/* Sub-tabs */}
        <nav
          className="flex gap-1 p-1"
          style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10 }}
        >
          {SUB_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="transition-all"
              style={{
                padding: "6px 16px",
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 6,
                color: activeTab === tab ? "#1A1A1A" : "#8F8F8F",
                background: activeTab === tab ? "#FFFFFF" : "transparent",
                boxShadow:
                  activeTab === tab
                    ? "0 1px 3px rgba(0,0,0,0.05)"
                    : "none",
                cursor: "pointer",
                border: "none",
              }}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "Account" && <AccountTab />}
      {activeTab === "Security" && <PlaceholderTab label="Security" />}
      {activeTab === "Billing" && <PlaceholderTab label="Billing" />}
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        color: "#8F8F8F",
        fontSize: 14,
        padding: "60px 0",
      }}
    >
      {label} settings coming soon.
    </div>
  );
}
