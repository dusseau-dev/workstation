"use client";

import { useSession } from "@/lib/auth-client";
import { DotGridBackground } from "./dot-grid-background";
import { OnboardingTopBar } from "./onboarding-top-bar";
import { WelcomeSection } from "./welcome-section";
import { TemplateGrid } from "./template-grid";
import { CommandBar } from "./command-bar";

export function OnboardingPage() {
  const { data: session } = useSession();
  const firstName = (session?.user?.name ?? "there").split(" ")[0];

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

      <OnboardingTopBar />

      <main className="relative z-[1] flex flex-1 items-center justify-center">
        <div className="flex w-[540px] flex-col gap-6">
          <WelcomeSection userName={firstName} />
          <TemplateGrid />
        </div>
      </main>

      <CommandBar />
    </div>
  );
}
