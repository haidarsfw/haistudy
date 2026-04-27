"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupportConversationSummary } from "@/types";

export interface UseSupportConversationsResult {
  conversations: SupportConversationSummary[];
  loading: boolean;
  refresh: () => Promise<void>;
  resolveConversation: (licenseKey: string) => Promise<boolean>;
}

/**
 * Admin-side hook for the conversation sidebar list.
 * Replaces the inline poll-every-15s in the old monolith.
 */
export function useSupportConversations(): UseSupportConversationsResult {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/support?all=true");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced refresh — coalesces rapid Realtime echoes
  const debouncedRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(refresh, 400);
  }, [refresh]);

  /* ── Initial + 60s safety polling (Realtime is primary) ── */
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => {
      clearInterval(interval);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    };
  }, [refresh]);

  /* ── Realtime: any change to support_messages refreshes the list ── */
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("support:msgs:all")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_messages" },
        () => debouncedRefresh()
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [debouncedRefresh]);

  const resolveConversation = useCallback(
    async (licenseKey: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/support", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseKey, action: "resolve" }),
        });
        if (!res.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  return { conversations, loading, refresh, resolveConversation };
}
