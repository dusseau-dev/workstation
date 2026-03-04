import { Providers } from "@/app/providers";
import { AgentationDev } from "@/components/agentation-dev";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      {children}
      <AgentationDev />
    </Providers>
  );
}
