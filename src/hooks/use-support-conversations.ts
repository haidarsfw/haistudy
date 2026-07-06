"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportAllChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";
import { createPollBackoff } from "@/lib/poll-backoff";
import type { ScopeTuple } from "@/types/scope";
import type { SupportConversationSummary } from "@/types";

export interface UseSupportConversationsOptions {
  /**
   * Admin can opt into cross-scope inbox by passing `allPeriods: true`.
   * When set, the hook fetches `?all=true&allPeriods=1` and falls back to
   * a global channel name (admin:support:all) to track inserts across scopes.
   */
  allPeriods?: boolean;
  /**
   * Override the scope used for fetching + channel subscription. Useful when
   * the consumer (admin support chat) wants to read a scope different from
   * the user's hs-scope cookie.
   */
  scopeOverride?: ScopeTuple;
}

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
export function useSupportConversations(
  options: UseSupportConversationsOptions = {}
): UseSupportConversationsResult {
  const [conversations, setConversations] = useState<SupportConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const scopeCtx = useOptionalScope();
  const scope = options.scopeOverride ?? scopeCtx?.scope ?? DEFAULT_SCOPE;
  const allPeriods = !!options.allPeriods;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build query string + key in one place so URL + Realtime stay in sync.
  const { fetchUrl, channelName } = useMemo(() => {
    const tail = allPeriods
      ? "&allPeriods=1"
      : `&scope=${scopeKey(scope)}`;
    return {
      fetchUrl: `/api/support?all=true${tail}`,
      channelName: allPeriods ? "admin:support:all" : supportAllChannel(scope),
    };
  }, [allPeriods, scope]);

  // Back off the safety poll if /api/support starts failing (Realtime is primary).
  const backoffRef = useRef(createPollBackoff(120_000));
  const refresh = useCallback(async () => {
    if (!backoffRef.current.shouldRun()) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        backoffRef.current.onFailure();
        return;
      }
      const data = await res.json();
      setConversations(data.conversations || []);
      backoffRef.current.onSuccess();
    } catch {
      backoffRef.current.onFailure();
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  // Debounced refresh - coalesces rapid Realtime echoes
  const debouncedRefresh = useCallback(() => {
    if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
    refreshDebounceRef.current = setTimeout(refresh, 400);
  }, [refresh]);

  /* ── Initial + 60s safety polling (Realtime is primary) ── */
  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, 120_000);
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

    // When allPeriods, omit the postgres_changes filter so we see every scope's
    // INSERTs. Otherwise, narrow by semester (Realtime supports one filter col;
    // exam_period+jurusan are confirmed by the GET refetch).
    const filter = allPeriods ? undefined : scopeRealtimeFilter(scope);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        filter
          ? { event: "INSERT", schema: "public", table: "support_messages", filter }
          : { event: "INSERT", schema: "public", table: "support_messages" },
        () => debouncedRefresh()
      )
      .on(
        "postgres_changes",
        filter
          ? { event: "UPDATE", schema: "public", table: "support_messages", filter }
          : { event: "UPDATE", schema: "public", table: "support_messages" },
        () => debouncedRefresh()
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [debouncedRefresh, channelName, allPeriods, scope]);

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
