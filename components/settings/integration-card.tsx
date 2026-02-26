"use client";

import { useState } from "react";
import { Puzzle, Check, LinkIcon, Unlink, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ComposioApp } from "@/lib/composio-types";

type IntegrationCardProps = {
  app: ComposioApp;
  isAdmin: boolean;
  connectedUserCount: number;
  currentUserConnected: boolean;
  latestActivity: string | null;
  onConnect: (appSlug: string) => Promise<void>;
  onDisconnect: (appSlug: string) => Promise<void>;
};

export function IntegrationCard({
  app,
  isAdmin,
  connectedUserCount,
  currentUserConnected,
  latestActivity,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const [loading, setLoading] = useState(false);
  const isConnected = connectedUserCount > 0;

  const handleConnect = async () => {
    setLoading(true);
    try {
      await onConnect(app.slug);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await onDisconnect(app.slug);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {app.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={app.logo}
              alt=""
              className="w-10 h-10 rounded shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
              <Puzzle className="w-5 h-5 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-sm truncate">{app.name}</h3>
              {isConnected ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400 shrink-0"
                >
                  <Check className="w-3 h-3 mr-1" />
                  {connectedUserCount} connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  Not Connected
                </Badge>
              )}
            </div>

            {latestActivity && (
              <p className="text-xs text-muted-foreground mt-1">
                Last used{" "}
                {new Date(latestActivity).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}

            {isAdmin && (
              <div className="mt-3">
                {!currentUserConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <LinkIcon className="w-3 h-3 mr-1" />
                    )}
                    Connect
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="text-destructive hover:text-destructive"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Unlink className="w-3 h-3 mr-1" />
                    )}
                    Disconnect
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
