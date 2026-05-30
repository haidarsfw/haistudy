"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { OnlineUser } from "@/types";
import { fetchOnlineUsers } from "@/lib/presence";
import { whenIdle } from "@/lib/defer";

// Poll every 120s. Presence is driven by 60s-visible / 5m-hidden heartbeats,
// so 120s is the natural freshness ceiling - faster polling just wastes DB IO
// without showing the user anything new.
//
// Previously subscribed to postgres_changes event:"*" on presence, which caused
// N×N query amplification: every user's 60s heartbeat fired UPDATEs that every
// other user's browser would refetch. With 50 concurrent users that was ~100
// queries/sec against a seq-scanned table - the primary cause of Disk IO
// Budget depletion. Polling-only eliminates the cascade entirely.
const POLL_INTERVAL_MS = 120_000;

export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const prevKeysRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOnlineUsers();
      setUsers(data);

      // Detect newly-online VIP/admin users and dispatch welcome event.
      // Skip hideStatus users and free/normal tiers.
      const prevKeys = prevKeysRef.current;
      const nextKeys = new Set(data.map((u) => u.licenseKey));

      // Only dispatch after the first poll (prevKeys non-empty) so the
      // initial load doesn't fire toasts for everyone already online.
      if (prevKeys.size > 0) {
        for (const u of data) {
          if (prevKeys.has(u.licenseKey)) continue; // not new
          if (u.hideStatus) continue;
          const tier = u.packageTier;
          const isVipOrAdmin = u.isAdmin || tier === "vip" || tier === "diamond";
          if (!isVipOrAdmin) continue;
          window.dispatchEvent(
            new CustomEvent("hs:vip-online", {
              detail: { licenseKey: u.licenseKey, name: u.userName, isAdmin: u.isAdmin },
            })
          );
        }
      }

      prevKeysRef.current = nextKeys;
    } catch {
      // Silently fail - stale data is better than a crash/loop
    }
  }, []);

  useEffect(() => {
    // Initial fetch deferred to idle so it doesn't queue a request on the
    // main thread during FCP. Polling interval is unaffected.
    const cancelIdle = whenIdle(() => {
      refresh();
    });
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelIdle();
      clearInterval(interval);
    };
  }, [refresh]);

  return { users, refresh };
}
