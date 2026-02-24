"use client";

import { useFindManyBoard } from "@/hooks/model/board";
import { useFindManyColumn } from "@/hooks/model/column";
import { useFindManyMember } from "@/hooks/model/member";
import type { DataSourceType } from "@/lib/workflow-node-types";

export function useDynamicOptions(
  dataSource: DataSourceType | undefined,
  dependsOnValue?: string
): { options: { label: string; value: string }[]; isLoading: boolean } {
  const boardsQuery = useFindManyBoard(
    { select: { id: true, name: true } },
    { enabled: dataSource === "boards" }
  );

  // When dependsOnValue is undefined: no dependency, fetch all columns
  // When dependsOnValue is "" (empty): parent not selected yet, skip query
  // When dependsOnValue is a real ID: fetch columns filtered by that board
  const columnsEnabled = dataSource === "columns" && dependsOnValue !== "";
  const columnsQuery = useFindManyColumn(
    {
      where: dependsOnValue ? { boardId: dependsOnValue } : undefined,
      select: { id: true, title: true },
      orderBy: { order: "asc" },
    },
    { enabled: columnsEnabled }
  );

  const membersQuery = useFindManyMember(
    {
      include: { user: { select: { id: true, name: true, email: true } } },
    },
    { enabled: dataSource === "members" }
  );

  if (dataSource === "boards") {
    return {
      options: (boardsQuery.data ?? []).map((b) => ({ label: b.name, value: b.id })),
      isLoading: boardsQuery.isLoading,
    };
  }
  if (dataSource === "columns") {
    return {
      options: (columnsQuery.data ?? []).map((c) => ({ label: c.title, value: c.id })),
      isLoading: columnsQuery.isLoading,
    };
  }
  if (dataSource === "members") {
    return {
      options: (membersQuery.data ?? []).map((m) => {
        const user = (m as { user?: { name?: string | null; email?: string | null } }).user;
        return {
          label: user?.name ?? user?.email ?? m.userId,
          value: m.userId,
        };
      }),
      isLoading: membersQuery.isLoading,
    };
  }

  return { options: [], isLoading: false };
}
