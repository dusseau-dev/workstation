"use client";

import { useActiveOrganization, useSession } from "@/lib/auth-client";
import { useMemo } from "react";

export function useOrgRole() {
  const { data: activeOrg } = useActiveOrganization();
  const { data: session } = useSession();

  return useMemo(() => {
    if (!activeOrg?.members || !session?.user?.id) {
      return { role: null as string | null, isAdmin: false };
    }
    const me = activeOrg.members.find(
      (m: { userId: string }) => m.userId === session.user.id
    );
    const role = me?.role ?? null;
    const isAdmin = role === "admin" || role === "owner";
    return { role, isAdmin };
  }, [activeOrg?.members, session?.user?.id]);
}
