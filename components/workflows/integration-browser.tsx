"use client";

import { useState, useEffect, useCallback, type DragEvent } from "react";
import { Puzzle, Search, ArrowLeft, LinkIcon, Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type ComposioApp = {
  name: string;
  slug: string;
  logo?: string;
  categories?: string[];
};

type ComposioTool = {
  name?: string;
  slug?: string;
  description?: string;
  // OpenAI-wrapped tools have { function: { name, description } }
  function?: { name: string; description: string };
};

type ConnectionInfo = {
  toolkit?: { slug: string };
  status?: string;
};

// Group apps into user-friendly categories
const CATEGORY_MAP: Record<string, string> = {
  "developer-tools": "Dev Tools",
  "communication": "Communication",
  "crm": "CRM",
  "productivity": "Productivity",
  "project-management": "Project Management",
  "marketing": "Marketing",
  "sales": "Sales",
  "finance": "Finance",
  "hr": "HR",
  "support": "Support",
  "storage": "Storage",
  "social-media": "Social Media",
};

function getCategory(app: ComposioApp): string {
  if (app.categories && app.categories.length > 0) {
    return CATEGORY_MAP[app.categories[0]] ?? app.categories[0];
  }
  return "Other";
}

function getToolName(tool: ComposioTool): string {
  return tool.function?.name ?? tool.slug ?? tool.name ?? "Unknown";
}

function getToolDescription(tool: ComposioTool): string {
  return tool.function?.description ?? tool.description ?? "";
}

function getToolLabel(tool: ComposioTool): string {
  const name = getToolName(tool);
  // Convert GITHUB_CREATE_ISSUE → Create Issue
  const parts = name.split("_");
  // Remove app prefix (first part)
  const rest = parts.slice(1).join(" ");
  return rest
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || name;
}

export function IntegrationBrowser() {
  const [apps, setApps] = useState<ComposioApp[]>([]);
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<ComposioApp | null>(null);
  const [actions, setActions] = useState<ComposioTool[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Fetch apps and connections on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [appsRes, connsRes] = await Promise.all([
          fetch("/api/integrations/composio/apps"),
          fetch("/api/integrations/composio/connections"),
        ]);
        if (appsRes.ok) {
          const data = await appsRes.json();
          setApps(data.items ?? data ?? []);
        }
        if (connsRes.ok) {
          const data = await connsRes.json();
          const items: ConnectionInfo[] = data.items ?? data ?? [];
          const connected = new Set<string>();
          for (const c of items) {
            if (c.toolkit?.slug && c.status === "ACTIVE") {
              connected.add(c.toolkit.slug);
            }
          }
          setConnections(connected);
        }
      } catch {
        // Silent fail — apps will show empty
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Fetch actions when an app is selected
  useEffect(() => {
    if (!selectedApp) {
      setActions([]);
      return;
    }
    async function loadActions() {
      setLoadingActions(true);
      try {
        const res = await fetch(
          `/api/integrations/composio/apps/${selectedApp!.slug}/actions`
        );
        if (res.ok) {
          const data = await res.json();
          setActions(Array.isArray(data) ? data : []);
        }
      } catch {
        // Silent fail
      } finally {
        setLoadingActions(false);
      }
    }
    void loadActions();
  }, [selectedApp]);

  const handleConnect = useCallback(async (appSlug: string) => {
    setConnecting(appSlug);
    try {
      const res = await fetch("/api/integrations/composio/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: appSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "width=600,height=700");
        }
        // Optimistically mark as connected
        setConnections((prev) => new Set([...prev, appSlug]));
      }
    } catch {
      // Silently fail
    } finally {
      setConnecting(null);
    }
  }, []);

  // Drag handler for actions
  const onDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>, tool: ComposioTool, appSlug: string) => {
      const toolName = getToolName(tool);
      // Set composio-specific data transfer
      e.dataTransfer.setData("application/workflow-composio-action", JSON.stringify({
        appName: appSlug,
        actionName: toolName,
        actionLabel: getToolLabel(tool),
      }));
      e.dataTransfer.setData("application/workflow-node-subtype", "composio_action");
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  // Filter apps by search
  const filteredApps = search
    ? apps.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.slug.toLowerCase().includes(search.toLowerCase())
      )
    : apps;

  // Group by category
  const grouped = new Map<string, ComposioApp[]>();
  for (const app of filteredApps) {
    const cat = getCategory(app);
    const list = grouped.get(cat) ?? [];
    list.push(app);
    grouped.set(cat, list);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Action list view for a selected app
  if (selectedApp) {
    const isConnected = connections.has(selectedApp.slug);
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b space-y-2">
          <button
            onClick={() => setSelectedApp(null)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to apps
          </button>
          <div className="flex items-center gap-2">
            {selectedApp.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedApp.logo}
                alt=""
                className="w-6 h-6 rounded"
              />
            ) : (
              <Puzzle className="w-6 h-6 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-semibold">{selectedApp.name}</p>
              {isConnected ? (
                <Badge variant="outline" className="text-[10px] h-4">
                  <Check className="w-2.5 h-2.5 mr-0.5" />
                  Connected
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[10px] px-1.5"
                  onClick={() => handleConnect(selectedApp.slug)}
                  disabled={connecting === selectedApp.slug}
                >
                  {connecting === selectedApp.slug ? (
                    <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                  ) : (
                    <LinkIcon className="w-2.5 h-2.5 mr-0.5" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingActions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : actions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">
              {isConnected
                ? "No actions available"
                : "Connect this app to see available actions"}
            </p>
          ) : (
            <div className="p-2 space-y-0.5">
              {actions.map((tool) => {
                const toolName = getToolName(tool);
                return (
                  <div
                    key={toolName}
                    draggable={isConnected}
                    onDragStart={(e) =>
                      onDragStart(e, tool, selectedApp.slug)
                    }
                    className={`px-2 py-1.5 rounded-md ${
                      isConnected
                        ? "cursor-grab active:cursor-grabbing hover:bg-accent"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <p className="text-sm font-medium truncate">
                      {getToolLabel(tool)}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">
                      {getToolDescription(tool)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // App list view
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Connect apps & drag actions
        </p>
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps..."
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {grouped.size === 0 ? (
          <p className="text-xs text-muted-foreground p-3">No apps found</p>
        ) : (
          <Accordion
            type="multiple"
            defaultValue={[...grouped.keys()]}
            className="px-2"
          >
            {[...grouped.entries()].map(([category, categoryApps]) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="py-2 text-xs font-semibold uppercase tracking-wider">
                  {category}
                </AccordionTrigger>
                <AccordionContent className="space-y-0.5 pb-2">
                  {categoryApps.map((app) => (
                    <button
                      key={app.slug}
                      onClick={() => setSelectedApp(app)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent text-left"
                    >
                      {app.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={app.logo}
                          alt=""
                          className="w-5 h-5 rounded shrink-0"
                        />
                      ) : (
                        <Puzzle className="w-5 h-5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm truncate flex-1">
                        {app.name}
                      </span>
                      {connections.has(app.slug) && (
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </ScrollArea>
    </div>
  );
}
