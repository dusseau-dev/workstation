"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { useOrgRole } from "./use-org-role";
import { Switch } from "@/components/ui/switch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFindManyComposioConnection } from "@/hooks/model";
import { useOrgChangeCallback } from "@/hooks/use-org-change-callback";
import type { ComposioApp } from "@/lib/composio-types";
import { Puzzle, Plus } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Shared section card
// ---------------------------------------------------------------------------
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "#F7F7F7",
        border: "1px solid #DEDEDE",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #DEDEDE" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// localStorage-backed toggle hook
// ---------------------------------------------------------------------------
function useLocalToggle(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null) setValue(stored === "true");
  }, [key]);

  const toggle = useCallback(() => {
    setValue((prev) => {
      const next = !prev;
      localStorage.setItem(key, String(next));
      return next;
    });
  }, [key]);

  return [value, toggle] as const;
}

// ---------------------------------------------------------------------------
// AccountTab
// ---------------------------------------------------------------------------
export function AccountTab() {
  return (
    <div className="flex flex-col gap-6">
      <ProfileSection />
      <NotificationPreferencesSection />
      <IntegrationsSection />
      <AccountManagementSection />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Profile
// ---------------------------------------------------------------------------
function ProfileSection() {
  const { data: session } = useSession();
  const user = session?.user;
  const { role } = useOrgRole();

  const displayName = user?.name ?? "Alex Loomis";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [name, setName] = useState(displayName);

  // Sync when session loads
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  return (
    <SettingsSection title="Profile">
      <div className="flex items-center gap-6">
        {/* Large avatar */}
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#222",
            fontSize: 24,
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {initials}
        </div>

        {/* Fields */}
        <div className="flex-1">
          <FieldGroup label="Display Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full outline-none"
              style={{
                background: "#EBEBEB",
                border: "1px solid #DEDEDE",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                color: "#1A1A1A",
                fontFamily: "inherit",
              }}
            />
          </FieldGroup>
          <FieldGroup label="Role" last>
            <input
              type="text"
              value={role === "admin" || role === "owner" ? "Admin" : "Member"}
              readOnly
              className="w-full outline-none"
              style={{
                background: "#EBEBEB",
                border: "1px solid #DEDEDE",
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                color: "#8F8F8F",
                fontFamily: "inherit",
              }}
            />
          </FieldGroup>
        </div>
      </div>
    </SettingsSection>
  );
}

function FieldGroup({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 500,
          color: "#8F8F8F",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Notification Preferences
// ---------------------------------------------------------------------------
function NotificationPreferencesSection() {
  const [emailNotifs, toggleEmail] = useLocalToggle(
    "settings:emailNotifications",
    true
  );
  const [desktopAlerts, toggleDesktop] = useLocalToggle(
    "settings:desktopAlerts",
    true
  );
  const [activityFeed, toggleActivity] = useLocalToggle(
    "settings:activityFeed",
    false
  );

  return (
    <SettingsSection title="Notification Preferences">
      <SettingRow
        title="Email Notifications"
        description="Receive weekly summaries and project updates."
        first
      >
        <Switch checked={emailNotifs} onCheckedChange={toggleEmail} />
      </SettingRow>
      <SettingRow
        title="Desktop Alerts"
        description="Real-time notifications for mentions and comments."
      >
        <Switch checked={desktopAlerts} onCheckedChange={toggleDesktop} />
      </SettingRow>
      <SettingRow
        title="Activity Feed"
        description="Show project activity in the sidebar."
        last
      >
        <Switch checked={activityFeed} onCheckedChange={toggleActivity} />
      </SettingRow>
    </SettingsSection>
  );
}

function SettingRow({
  title,
  description,
  children,
  titleColor = "#1A1A1A",
  first = false,
  last = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  titleColor?: string;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid #DEDEDE",
        paddingTop: first ? 0 : 12,
        paddingBottom: last ? 0 : 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: titleColor }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "#8F8F8F", marginTop: 2 }}>
          {description}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Connected Integrations
// ---------------------------------------------------------------------------
function IntegrationsSection() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const currentUserId = session?.user?.id;

  const { data: appsData } = useQuery({
    queryKey: ["composio-apps"],
    queryFn: async () => {
      const res = await fetch("/api/integrations/composio/apps");
      if (!res.ok) throw new Error("Failed to fetch apps");
      const data = await res.json();
      return (data.items ?? data ?? []) as ComposioApp[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: dbConnections = [], refetch: refetchConnections } =
    useFindManyComposioConnection({ orderBy: { updatedAt: "desc" } });

  useOrgChangeCallback(() => {
    void refetchConnections();
    void queryClient.invalidateQueries({ queryKey: ["composio-apps"] });
  });

  // Apps that the current user has connected
  const connectedSlugs = useMemo(() => {
    const set = new Set<string>();
    for (const c of dbConnections) {
      if (c.status === "CONNECTED" && c.userId === currentUserId)
        set.add(c.appName);
    }
    return set;
  }, [dbConnections, currentUserId]);

  // Show connected apps first, then up to a few popular unconnected ones
  const visibleApps = useMemo(() => {
    const apps = appsData ?? [];
    const connected = apps.filter((a) => connectedSlugs.has(a.slug));
    const unconnected = apps
      .filter((a) => !connectedSlugs.has(a.slug))
      .slice(0, Math.max(0, 3 - connected.length));
    return [...connected, ...unconnected];
  }, [appsData, connectedSlugs]);

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
          if (data.redirectUrl)
            window.open(data.redirectUrl, "_blank", "width=600,height=700");
          setTimeout(() => void refetchConnections(), 2000);
          toast.success("Complete the OAuth flow in the popup.");
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

  return (
    <SettingsSection title="Connected Integrations">
      <div className="grid grid-cols-2 gap-2">
        {visibleApps.map((app) => {
          const connected = connectedSlugs.has(app.slug);
          return (
            <div
              key={app.slug}
              className="flex items-center gap-3"
              style={{
                padding: 12,
                border: "1px solid #DEDEDE",
                borderRadius: 8,
                background: "#FFFFFF",
              }}
            >
              <div
                className="flex shrink-0 items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "#EBEBEB",
                  overflow: "hidden",
                }}
              >
                {app.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.logo} alt="" className="h-5 w-5 object-contain" />
                ) : (
                  <Puzzle size={14} color="#8F8F8F" />
                )}
              </div>

              <span className="flex-1" style={{ fontSize: 13, fontWeight: 500 }}>
                {app.name}
              </span>

              <button
                onClick={() => {
                  if (!connected) void handleConnect(app.slug);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid #DEDEDE",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: connected ? "default" : "pointer",
                  color: connected ? "#8F8F8F" : "#1A1A1A",
                }}
              >
                {connected ? "Connected" : "Configure"}
              </button>
            </div>
          );
        })}

        {/* Add new integration */}
        <div
          className="flex items-center gap-3"
          style={{
            padding: 12,
            border: "1px solid #DEDEDE",
            borderRadius: 8,
            background: "#FFFFFF",
            cursor: "pointer",
          }}
          onClick={() => toast.info("Full integrations browser coming soon.")}
        >
          <div
            className="flex shrink-0 items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "#EBEBEB",
            }}
          >
            <Plus size={14} color="#8F8F8F" />
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#8F8F8F" }}>
            Add new integration...
          </span>
        </div>
      </div>
    </SettingsSection>
  );
}

// ---------------------------------------------------------------------------
// 4. Account Management
// ---------------------------------------------------------------------------
function AccountManagementSection() {
  return (
    <SettingsSection title="Account Management">
      <SettingRow
        title="Export Data"
        description="Download a copy of your personal workspace data."
        first
      >
        <button
          onClick={() => toast.info("Export feature coming soon.")}
          style={{
            background: "transparent",
            border: "1px solid #DEDEDE",
            padding: "6px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Export
        </button>
      </SettingRow>

      <SettingRow
        title="Deactivate Account"
        description="Permanently remove your account and data."
        titleColor="#D0021B"
        last
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              style={{
                background: "transparent",
                border: "1px solid rgba(208, 2, 27, 0.2)",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: "#D0021B",
                cursor: "pointer",
              }}
            >
              Deactivate
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent and cannot be undone. All your data will
                be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void signOut()}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingRow>
    </SettingsSection>
  );
}
