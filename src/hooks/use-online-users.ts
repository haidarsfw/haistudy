"use client";

import { useEffect, useState, useCallback } from "react";
import type { OnlineUser } from "@/types";
import { fetchOnlineUsers } from "@/lib/presence";

// Poll every 120s. Presence is driven by 60s-visible / 5m-hidden heartbeats,
// so 120s is the natural freshness ceiling — faster polling just wastes DB IO
// without showing the user anything new.
//
// Previously subscribed to postgres_changes event:"*" on presence, which caused
// N×N query amplification: every user's 60s heartbeat fired UPDATEs that every
// other user's browser would refetch. With 50 concurrent users that was ~100
// queries/sec against a seq-scanned table — the primary cause of Disk IO
// Budget depletion. Polling-only eliminates the cascade entirely.
const POLL_INTERVAL_MS = 120_000;

export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchOnlineUsers();
      setUsers(data);
    } catch {
      // Silently fail — stale data is better than a crash/loop
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { users, refresh };
}
