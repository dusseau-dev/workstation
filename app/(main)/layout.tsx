import { Providers } from "@/app/providers";
import { Header } from "@/components/header";
import { AgentationDev } from "@/components/agentation-dev";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex min-h-svh flex-col">
        <Header />
        {children}
      </div>
      <AgentationDev />
    </Providers>
  );
}
