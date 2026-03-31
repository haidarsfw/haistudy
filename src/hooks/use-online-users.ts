"use client";

import { useEffect, useState, useCallback } from "react";
import type { OnlineUser } from "@/types";
import { fetchOnlineUsers } from "@/lib/presence";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/lib/supabase/client";

/**
 * Hook to subscribe to online users.
 * Uses Supabase Realtime when configured, otherwise polls mock data.
 */
export function useOnlineUsers() {
  const [users, setUsers] = useState<OnlineUser[]>([]);

  const refresh = useCallback(async () => {
    const data = await fetchOnlineUsers();
    setUsers(data);
  }, []);

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
          () => refresh()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Poll mock data every 30s
      const interval = setInterval(refresh, 30_000);
      return () => clearInterval(interval);
    }
  }, [refresh]);

  return { users, refresh };
}
