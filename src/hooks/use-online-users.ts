"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { OnlineUser } from "@/types";
import { fetchOnlineUsers } from "@/lib/presence";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to subscribe to online users.
 * Uses Supabase Realtime when configured, otherwise polls mock data.
 * Includes debouncing, polling fallback, and error recovery.
 */
export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const data = await fetchOnlineUsers();
    setUsers(data);
  }, []);

  // Debounced refresh to prevent rapid cascading fetches from realtime events
  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refresh();
    }, 300);
  }, [refresh]);

  useEffect(() => {
    refresh();

    if (isSupabaseConfigured) {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel("presence-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "presence" },
          () => debouncedRefresh()
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // Channel is live — do an immediate fresh fetch
            refresh();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Recover from subscription errors
            console.warn("Presence channel error:", status);
            refresh();
          }
        });

      // Polling fallback every 10s as safety net if realtime drops silently
      const pollInterval = setInterval(refresh, 10_000);

      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        clearInterval(pollInterval);
        supabase.removeChannel(channel);
      };
    } else {
      // Poll mock data every 30s
      const interval = setInterval(refresh, 30_000);
      return () => clearInterval(interval);
    }
  }, [refresh, debouncedRefresh]);

  return { users, refresh };
}
