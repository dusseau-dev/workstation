"use client";

import { DotGridBackground } from "@/components/onboarding/dot-grid-background";
import { OnboardingTopBar } from "@/components/onboarding/onboarding-top-bar";
import { CommandBar } from "@/components/onboarding/command-bar";
import { SettingsContent } from "./settings-content";

export function SettingsPage() {
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

      <OnboardingTopBar subtitle="Settings" />

      <main className="relative z-[1] flex-1 overflow-y-auto px-16 py-8 pb-24">
        <SettingsContent />
      </main>

      <CommandBar delay={0} />
    </div>
  );
}
