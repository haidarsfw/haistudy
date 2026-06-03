"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/providers/session-provider";

/**
 * Pending-purchase count for the admin red-dot badges (sidebar, mobile "More",
 * admin Purchase tab). Admins only.
 *
 * Mechanism: fetch on mount + on window focus + a light interval poll, plus a
 * local `decrement()` for snappy updates right after approve/reject. We do NOT
 * use Realtime here on purpose — purchase_requests carries buyer PII and has no
 * anon SELECT policy, so anon Realtime would deliver nothing (and adding a
 * `USING(true)` policy would leak PII). Polling is the PII-safe choice.
 *
 * @param opts.scopeQuery When provided (admin shell, inside AdminScopeProvider),
 *   scopes the count to the admin's selected scope. Omit elsewhere (app shell)
 *   to fall back to the admin's hs-scope cookie server-side.
 */
export function useAdminPurchaseCount(opts?: {
  scopeQuery?: () => string;
  pollMs?: number;
}) {
  const { session } = useSession();
  const isAdmin = !!session?.isAdmin;
  const scopeQuery = opts?.scopeQuery;
  const pollMs = opts?.pollMs ?? 45_000;
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const sq = scopeQuery ? scopeQuery() : "";
      const sep = sq ? "&" : "?";
      const res = await fetch(`/api/admin/purchase${sq}${sep}count=pending`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.pendingCount === "number") setPendingCount(data.pendingCount);
    } catch {
      /* non-critical */
    }
  }, [isAdmin, scopeQuery]);

  // Mount + dependency changes (e.g. admin switches scope → scopeQuery identity changes).
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Window focus + light interval keep the dot fresh while the tab is open.
  useEffect(() => {
    if (!isAdmin) return;
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(refresh, pollMs);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [isAdmin, refresh, pollMs]);

  const decrement = useCallback(
    (n = 1) => setPendingCount((c) => Math.max(0, c - n)),
    []
  );

  return { pendingCount, refresh, decrement, setPendingCount };
}
