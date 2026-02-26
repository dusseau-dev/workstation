"use client";

import { useState, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFindManyComposioConnection } from "@/hooks/model";
import { useSession } from "@/lib/auth-client";
import { useOrgChangeCallback } from "@/hooks/use-org-change-callback";
import { useOrgRole } from "./use-org-role";
import { IntegrationCard } from "./integration-card";
import { getCategory, CATEGORY_MAP, type ComposioApp } from "@/lib/composio-types";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function IntegrationsTab() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const { isAdmin } = useOrgRole();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // Fetch available apps from Composio
  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ["composio-apps"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/composio/apps");
      if (!res.ok) throw new Error("Failed to fetch apps");
      const data = await res.json();
      return (data.items ?? data ?? []) as ComposioApp[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch org connections from DB via ZenStack (policies handle access control)
  const {
    data: dbConnections = [],
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = useFindManyComposioConnection({
    orderBy: { updatedAt: "desc" },
  });

  // Refetch on org change
  useOrgChangeCallback(() => {
    void refetchConnections();
    void queryClient.invalidateQueries({ queryKey: ["composio-apps"] });
  });

  const apps = appsData ?? [];
  const currentUserId = session?.user?.id;

  // Build connection summary per app from DB records
  const connectionSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        count: number;
        latestUpdate: string | null;
        currentUserConnected: boolean;
      }
    >();

    for (const conn of dbConnections) {
      if (conn.status !== "CONNECTED") continue;
      const existing = map.get(conn.appName);
      if (existing) {
        existing.count += 1;
        const updatedStr = conn.updatedAt
          ? typeof conn.updatedAt === "string"
            ? conn.updatedAt
            : new Date(conn.updatedAt).toISOString()
          : null;
        if (
          updatedStr &&
          (!existing.latestUpdate || updatedStr > existing.latestUpdate)
        ) {
          existing.latestUpdate = updatedStr;
        }
        if (conn.userId === currentUserId) {
          existing.currentUserConnected = true;
        }
      } else {
        map.set(conn.appName, {
          count: 1,
          latestUpdate: conn.updatedAt
            ? typeof conn.updatedAt === "string"
              ? conn.updatedAt
              : new Date(conn.updatedAt).toISOString()
            : null,
          currentUserConnected: conn.userId === currentUserId,
        });
      }
    }
    return map;
  }, [dbConnections, currentUserId]);

  // Filter + group apps
  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      const matchesSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.slug.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !activeCategory || getCategory(a) === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, search, activeCategory]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(apps.map(getCategory));
    // Sort with known categories first
    const knownOrder = Object.values(CATEGORY_MAP);
    return [...cats].sort((a, b) => {
      const ai = knownOrder.indexOf(a);
      const bi = knownOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [apps]);

  const handleConnect = useCallback(
    async (appSlug: string) => {
      try {
        const res = await fetch("/api/integrations/composio/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appName: appSlug,
            callbackUrl: `${window.location.origin}/settings`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.redirectUrl) {
            window.open(data.redirectUrl, "_blank", "width=600,height=700");
          }
          // Refetch connections after a short delay to allow OAuth to complete
          setTimeout(() => void refetchConnections(), 2000);
          toast.success("Connection initiated. Complete the OAuth flow in the popup.");
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to connect");
        }
      } catch {
        toast.error("Failed to initiate connection");
      }
    },
    [refetchConnections]
  );

  const handleDisconnect = useCallback(
    async (appSlug: string) => {
      try {
        const res = await fetch("/api/integrations/composio/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appName: appSlug }),
        });
        if (res.ok) {
          toast.success("Disconnected successfully");
          void refetchConnections();
        } else {
          const err = await res.json();
          toast.error(err.error || "Failed to disconnect");
        }
      } catch {
        toast.error("Failed to disconnect");
      } finally {
        setDisconnectTarget(null);
      }
    },
    [refetchConnections]
  );

  const isLoading = appsLoading || connectionsLoading;

  return (
    <div className="mt-6 space-y-4">
      {/* Search and filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations..."
            className="pl-8"
          />
        </div>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setActiveCategory(activeCategory === cat ? null : cat)
              }
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || activeCategory
            ? "No integrations match your search"
            : "No integrations available"}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredApps.map((app) => {
            const summary = connectionSummary.get(app.slug);
            return (
              <IntegrationCard
                key={app.slug}
                app={app}
                isAdmin={isAdmin}
                connectedUserCount={summary?.count ?? 0}
                currentUserConnected={summary?.currentUserConnected ?? false}
                latestActivity={summary?.latestUpdate ?? null}
                onConnect={handleConnect}
                onDisconnect={(slug) => {
                  setDisconnectTarget(slug);
                  return Promise.resolve();
                }}
              />
            );
          })}
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={(open) => {
          if (!open) setDisconnectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect integration</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your {disconnectTarget} integration.
              Workflows using this integration will no longer be able to execute
              actions until reconnected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectTarget) void handleDisconnect(disconnectTarget);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
