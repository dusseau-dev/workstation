"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrgChangeCallback } from "@/hooks/use-org-change-callback";
import type { Workflow } from "@zenstackhq/runtime/models";
import { useFindManyWorkflow } from "@/hooks/model";
import { ActionHeading } from "@/components/boards/action-heading";
import { useModalQuery } from "@/lib/use-modal-query";

type Props = {
  initialData?: Workflow[] | null;
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  ARCHIVED: "outline",
};

export function WorkflowsList({ initialData }: Props) {
  const {
    data: workflows,
    refetch,
    isLoading,
    isFetching,
  } = useFindManyWorkflow(
    { orderBy: { updatedAt: "desc" } },
    {
      initialData,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: true,
      optimisticUpdate: true,
    }
  );

  const { openAddWorkflowModal } = useModalQuery();

  useOrgChangeCallback(() => {
    void refetch();
  });

  return (
    <div className="container mx-auto py-8">
      <ActionHeading title="Workflows" isFetching={isFetching} isLoading={isLoading}>
        <Button disabled={isLoading} onClick={openAddWorkflowModal}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </ActionHeading>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-5 bg-muted rounded w-2/3" /></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-1/3" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {workflows?.map((workflow) => {
              const status = workflow.status ?? "DRAFT";
              return (
              <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      <Link href={`/workflows/${workflow.id}`} className="hover:text-primary">
                        {workflow.name}
                      </Link>
                    </CardTitle>
                    <Badge variant={statusVariant[status] ?? "secondary"}>
                      {status.toLowerCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {workflow.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {workflow.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
              );
            })}
          </div>

          {workflows?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No workflows yet. Create your first workflow to automate board actions!
              </p>
              <Button onClick={openAddWorkflowModal}>
                <Plus className="mr-2 h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
