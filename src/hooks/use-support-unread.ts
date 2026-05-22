"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportUnreadChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "hs-support-last-read";

/**
 * Tracks unread support messages.
 *  - For users: counts admin messages since last time they opened the support panel
 *    (kept simple — single conversation, localStorage-tracked).
 *  - For admins: total unread USER messages across ALL conversations.
 *    Always derived from server (`/api/support?all=true`) to avoid drift —
 *    refetch on relevant realtime events + visibility change.
 */
export function useSupportUnread() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [unreadCount, setUnreadCount] = useState(0);
  const isPanelOpenRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getLastRead = useCallback((): string | null => {
    if (!session?.licenseKey) return null;
    try {
      return localStorage.getItem(`${STORAGE_KEY}-${session.licenseKey}`);
    } catch {
      return null;
    }
  }, [session?.licenseKey]);

  const fetchUnread = useCallback(async () => {
    if (!session?.licenseKey) return;
    try {
      if (session.isAdmin) {
        // Always derive from server-truth — sum unread across conversations
        const res = await fetch("/api/support?all=true", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const total = (data.conversations || []).reduce(
          (sum: number, c: { unreadCount?: number; unread_count?: number }) =>
            sum + (c.unreadCount ?? c.unread_count ?? 0),
          0
        );
        setUnreadCount(total);
      } else {
        const res = await fetch(
          `/api/support?licenseKey=${encodeURIComponent(session.licenseKey)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        const messages = (data.messages || []) as Array<{
          isAdmin?: boolean;
          isSystem?: boolean;
          createdAt?: string;
          is_admin?: boolean;
          is_system?: boolean;
          created_at?: string;
        }>;
        const lastRead = getLastRead();
        const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;
        const count = messages.filter((m) => {
          const isAdmin = m.isAdmin ?? m.is_admin ?? false;
          const isSystem = m.isSystem ?? m.is_system ?? false;
          const createdAt = new Date(m.createdAt ?? m.created_at ?? 0).getTime();
          return isAdmin && !isSystem && (lastReadTime === 0 || createdAt > lastReadTime);
        }).length;
        setUnreadCount(count);
      }
    } catch {
      // silent
    }
  }, [session?.licenseKey, session?.isAdmin, getLastRead]);

  // Debounced fetch — coalesce burst of realtime events
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchUnread, 350);
  }, [fetchUnread]);

  /* ── Initial fetch ── */
  useEffect(() => {
    if (!session?.licenseKey) return;
    fetchUnread();
  }, [session?.licenseKey, fetchUnread]);

  /* ── Refetch on tab visibility ── */
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) fetchUnread();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchUnread]);

  /* ── Realtime: refetch on any message change instead of local mutation ── */
  useEffect(() => {
    if (!session?.licenseKey || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const filter = session.isAdmin
      ? undefined
      : `license_key=eq.${session.licenseKey}`;

    const channel = supabase
      .channel(supportUnreadChannel(scope, session.licenseKey))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          ...(filter ? { filter } : { filter: scopeRealtimeFilter(scope) }),
        },
        () => debouncedFetch()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
          ...(filter ? { filter } : {}),
        },
        () => debouncedFetch()
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [session?.licenseKey, session?.isAdmin, debouncedFetch]);

  const markAsRead = useCallback(() => {
    if (!session?.licenseKey) return;
    isPanelOpenRef.current = true;
    setUnreadCount(0);
    try {
      localStorage.setItem(
        `${STORAGE_KEY}-${session.licenseKey}`,
        new Date().toISOString()
      );
    } catch {
      // ignore
    }
    // Force a fresh count from server right after mark-as-read; this also
    // triggers admin to re-derive after navigating to support tab.
    setTimeout(fetchUnread, 250);
  }, [session?.licenseKey, fetchUnread]);

  const markPanelClosed = useCallback(() => {
    isPanelOpenRef.current = false;
    fetchUnread();
  }, [fetchUnread]);

  return { unreadCount, markAsRead, markPanelClosed };
}
