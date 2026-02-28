import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { getZenstackPrisma } from "@/lib/db";
import { SettingsPage } from "@/components/settings/settings-page";

export default async function SettingsRoute() {
  const queryClient = getQueryClient();

  // Prefetch org connections via ZenStack (policies handle access control)
  try {
    const db = await getZenstackPrisma();
    const connections = await db.composioConnection.findMany({
      orderBy: { updatedAt: "desc" },
    });
    queryClient.setQueryData(
      ["ComposioConnection", "findMany", { orderBy: { updatedAt: "desc" } }],
      connections
    );
  } catch {
    // Will be fetched client-side as fallback
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SettingsPage />
    </HydrationBoundary>
  );
}
