import { Providers } from "@/app/providers";
import { AgentationDev } from "@/components/agentation-dev";

export default function SettingsLayout({
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
