"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { createPollBackoff } from "@/lib/poll-backoff";

/**
 * Pending-purchase count for the admin red-dot badges (sidebar, mobile "More",
 * admin Purchase tab). Admins only.
 *
 * SHARED, VISIBILITY-GATED POLLER. The hook mounts in up to 3 places and several
 * are alive at once (sidebar + mobile-nav both mount in the app shell), so the
 * old design ran 2-3 independent 45s intervals that hit `/api/admin/purchase`
 * around the clock — even when the tab was backgrounded. On an admin dashboard
 * left open 24/7 that was a continuous, wasted Vercel Active-CPU drain (it was the
 * single busiest route in the runtime logs, ~2 hits/minute nonstop). Fix:
 *   1. All instances that hit the SAME url share ONE interval + ONE network poll.
 *   2. The poll PAUSES while the tab is hidden and refreshes the moment it returns.
 * Net: a backgrounded admin tab now costs ZERO invocations; a foreground one polls
 * once per interval instead of 2-3x.
 *
 * Still no Realtime here on purpose — purchase_requests carries buyer PII and has
 * no anon SELECT policy, so polling is the PII-safe choice.
 *
 * @param opts.scopeQuery When provided (admin shell, inside AdminScopeProvider),
 *   scopes the count to the admin's selected scope. Omit elsewhere (app shell)
 *   to fall back to the admin's hs-scope cookie server-side.
 */

type Poller = {
  subs: Set<(n: number) => void>;
  interval: ReturnType<typeof setInterval> | null;
  backoff: ReturnType<typeof createPollBackoff>;
  last: number;
  getUrl: () => string;
};

// One poller per distinct request URL. sidebar + mobile-nav share the cookie-scoped
// key; the admin panel (scoped) gets its own. Keyed by a stable string, not the
// resolved url, so a scope switch just swaps getUrl on the same entry.
const pollers = new Map<string, Poller>();
let visibilityBound = false;

function bindVisibilityOnce() {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  const refreshAll = () => {
    if (document.hidden) return;
    for (const key of pollers.keys()) void runPoll(key);
  };
  document.addEventListener("visibilitychange", refreshAll);
  window.addEventListener("focus", refreshAll);
}

async function runPoll(key: string) {
  const p = pollers.get(key);
  if (!p) return;
  // Visibility gate: a hidden/backgrounded tab must never hit the serverless
  // route. The interval keeps ticking but does nothing until the tab is visible.
  if (typeof document !== "undefined" && document.hidden) return;
  if (!p.backoff.shouldRun()) return;
  try {
    const res = await fetch(p.getUrl(), { cache: "no-store" });
    if (!res.ok) {
      p.backoff.onFailure();
      return;
    }
    const data = await res.json();
    if (typeof data.pendingCount === "number") {
      p.last = data.pendingCount;
      p.subs.forEach((s) => s(p.last));
    }
    p.backoff.onSuccess();
  } catch {
    p.backoff.onFailure();
  }
}

function subscribe(
  key: string,
  pollMs: number,
  getUrl: () => string,
  cb: (n: number) => void
): () => void {
  bindVisibilityOnce();
  let p = pollers.get(key);
  if (!p) {
    p = {
      subs: new Set(),
      interval: null,
      backoff: createPollBackoff(pollMs),
      last: 0,
      getUrl,
    };
    pollers.set(key, p);
  }
  p.getUrl = getUrl; // keep the freshest closure (scopeQuery may change over time)
  p.subs.add(cb);
  cb(p.last); // hand the new subscriber the last known value immediately
  if (!p.interval) {
    p.interval = setInterval(() => void runPoll(key), pollMs);
    void runPoll(key); // initial fetch
  }
  return () => {
    const cur = pollers.get(key);
    if (!cur) return;
    cur.subs.delete(cb);
    if (cur.subs.size === 0) {
      if (cur.interval) clearInterval(cur.interval);
      pollers.delete(key);
    }
  };
}

export function useAdminPurchaseCount(opts?: {
  scopeQuery?: () => string;
  pollMs?: number;
}) {
  const { session } = useSession();
  const isAdmin = !!session?.isAdmin;
  const scopeQuery = opts?.scopeQuery;
  const pollMs = opts?.pollMs ?? 45_000;
  const [pendingCount, setPendingCount] = useState(0);

  // Stable poller key: the resolved scope query (empty → cookie-scoped). All
  // no-arg mounts (sidebar, mobile-nav) collapse onto one "__cookie__" poller.
  const key = (scopeQuery ? scopeQuery() : "") || "__cookie__";

  useEffect(() => {
    if (!isAdmin) return;
    const getUrl = () => {
      const q = scopeQuery ? scopeQuery() : "";
      const sep = q ? "&" : "?";
      return `/api/admin/purchase${q}${sep}count=pending`;
    };
    return subscribe(key, pollMs, getUrl, setPendingCount);
  }, [isAdmin, key, pollMs, scopeQuery]);

  const refresh = useCallback(() => {
    void runPoll(key);
  }, [key]);

  // Snappy local nudge right after approve/reject; the next poll reconciles with
  // the server. Broadcasts to every badge sharing this poller so they stay in sync.
  const decrement = useCallback(
    (n = 1) => {
      const p = pollers.get(key);
      if (!p) return;
      p.last = Math.max(0, p.last - n);
      p.subs.forEach((s) => s(p.last));
    },
    [key]
  );

  return { pendingCount, refresh, decrement, setPendingCount };
}
