"use client";

import { useCallback, useEffect, useState } from "react";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { groupChatChannel } from "@/lib/realtime/channels";
import { toGroupMessage, type GroupMessage } from "@/lib/mentor/chat";

/**
 * One mentoring group's chat: history from the API, new messages and deletions
 * live over Realtime.
 *
 * The postgres_changes filter on `group_id` is allowed because group_messages
 * is REPLICA IDENTITY FULL (migration 085); a filter on a column outside the
 * replica identity is what once looped subscriptions on the free tier. The row
 * policy delivers only to members, so the filter is about traffic, not access.
 */
export function useGroupChat(groupId: string | null) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [role, setRole] = useState<"mentor" | "member" | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upsert = useCallback((m: GroupMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i === -1) return [...prev, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const next = prev.slice();
      next[i] = m;
      return next;
    });
  }, []);

  // A different group starts from nothing. Reset while rendering, when the
  // id changes, so the old group's messages never flash under the new name.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (groupId !== loadedFor) {
    setLoadedFor(groupId);
    setMessages([]);
    setError(null);
    setHasMore(false);
    setLoading(Boolean(groupId));
  }

  useEffect(() => {
    if (!groupId) return;
    let alive = true;
    fetch(`/api/mentor/groups/${groupId}/messages`, { credentials: "same-origin" })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) {
          setError(body.error ?? "Chat grup tidak bisa dimuat.");
          return;
        }
        setMessages(body.messages ?? []);
        setHasMore(Boolean(body.hasMore));
        setRole(body.role ?? null);
        setMe(body.me ?? null);
      })
      .catch(() => alive && setError("Koneksi terputus."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;
    // This subscription belongs to this group; switching groups tears it
    // down and opens another, so the closure's groupId is always the right one.
    const onRow = (row: Record<string, unknown>) => {
      if (row?.group_id !== groupId) return;
      upsert(toGroupMessage(row));
    };
    const channel = supabase
      .channel(groupChatChannel(groupId))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (p) => onRow(p.new as Record<string, unknown>)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (p) => onRow(p.new as Record<string, unknown>)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, upsert]);

  const loadMore = useCallback(async () => {
    if (!groupId || !messages.length) return;
    const r = await fetch(
      `/api/mentor/groups/${groupId}/messages?before=${encodeURIComponent(messages[0].createdAt)}`,
      { credentials: "same-origin" }
    );
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...(body.messages ?? []).filter((m: GroupMessage) => !seen.has(m.id)), ...prev];
    });
    setHasMore(Boolean(body.hasMore));
  }, [groupId, messages]);

  /** Resolves to an error message, or null when sent. */
  const send = useCallback(
    async (content: string, quote?: { text: string; source?: string } | null): Promise<string | null> => {
      if (!groupId) return "Pilih grup dulu.";
      try {
        const r = await fetch(`/api/mentor/groups/${groupId}/messages`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ content, quote: quote?.text, quoteSource: quote?.source }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) return body.error ?? "Pesan gagal dikirim.";
        // Shown at once; the Realtime echo of the same row is merged by id.
        if (body.message) upsert(body.message as GroupMessage);
        return null;
      } catch {
        return "Koneksi terputus.";
      }
    },
    [groupId, upsert]
  );

  const remove = useCallback(
    async (messageId: string): Promise<string | null> => {
      if (!groupId) return null;
      const r = await fetch(`/api/mentor/groups/${groupId}/messages?messageId=${messageId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!r.ok) return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Gagal menghapus.";
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deleted: true, content: null, quote: null, quoteSource: null } : m))
      );
      return null;
    },
    [groupId]
  );

  return { messages, loading, hasMore, role, me, error, loadMore, send, remove };
}
