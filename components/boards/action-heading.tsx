import { Fragment, useMemo } from "react";
import { Loader2, Pause } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Breadcrumb = { label: string; href?: string };

export function ActionHeading({
  title,
  description,
  status,
  breadcrumbs,
  isFetching,
  isLoading,
  isPaused,
  children,
}: {
  title: string;
  description?: string | null;
  status?: string | null;
  breadcrumbs?: Breadcrumb[];
  isFetching?: boolean;
  isLoading?: boolean;
  isPaused?: boolean;
  children: React.ReactNode;
}) {
  const stateString = useMemo(() => {
    if (isFetching) return "Updating...";
    if (isLoading) return "Loading...";
    if (isPaused) return "Paused";
    return null;
  }, [isFetching, isLoading, isPaused]);

  const stateIcon = useMemo(() => {
    if (isFetching || isLoading) return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    if (isPaused) return <Pause className="h-3.5 w-3.5" />;
    return null;
  }, [isFetching, isLoading, isPaused]);

  return (
    <div className="mb-8 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-medium tracking-[-0.02em]">{title}</h1>
            {status && (
              <Badge className="uppercase text-[10px] tracking-wider font-semibold bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                {status.replace(/_/g, " ")}
              </Badge>
            )}
            {stateIcon && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {stateIcon}
                {stateString}
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}
