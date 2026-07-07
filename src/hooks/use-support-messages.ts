"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportMsgsChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import type {
  SupportMessage,
  SupportSendStatus,
} from "@/types";

interface SendOptions {
  type?: "text" | "image" | "audio";
  mediaUrl?: string | null;
  replyTo?: { id: string; name: string; content: string } | null;
  isInternal?: boolean;
}

const PENDING_CAP = 20;

function nonce() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseSupportMessagesResult {
  messages: SupportMessage[];
  loading: boolean;
  sendMessage: (
    content: string,
    senderName: string,
    opts?: SendOptions
  ) => Promise<SupportMessage | null>;
  editMessage: (id: string, content: string) => Promise<{
    ok: boolean;
    error?: string;
    code?: string;
  }>;
  unsendMessage: (id: string) => Promise<{ ok: boolean; error?: string }>;
  retryFailed: (clientNonce: string, senderName: string) => Promise<void>;
  removeFailed: (clientNonce: string) => void;
}

/**
 * Source of truth for messages in a single support conversation.
 * Handles initial fetch, INSERT/UPDATE/DELETE realtime, optimistic send with
 * client_nonce dedup, and edit propagation.
 *
 * @param viewerIsAdmin if false, internal-note rows are filtered out client-side
 *   as defense-in-depth (server already filters in GET; realtime broadcast may
 *   still deliver them, so we drop on insert/update).
 */
export function useSupportMessages(
  licenseKey: string | null,
  viewerIsAdmin: boolean
): UseSupportMessagesResult {
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /* ─────────────── Initial + refetch ─────────────── */
  const fetchAll = useCallback(async () => {
    if (!licenseKey) return;
    try {
      const res = await fetch(`/api/support?licenseKey=${encodeURIComponent(licenseKey)}`);
      if (res.ok) {
        const data = await res.json();
        const fresh = (data.messages || []) as SupportMessage[];
        setMessages((prev) => mergeServerWithPending(fresh, prev));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [licenseKey]);

  useEffect(() => {
    if (!licenseKey) return;
    setLoading(true);
    fetchAll();
  }, [licenseKey, fetchAll]);

  /* ─────────────── Realtime subscriptions ─────────────── */
  useEffect(() => {
    if (!licenseKey || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(supportMsgsChannel(scope, licenseKey))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // postgres_changes filters semester only — cross-check the rest of
          // the scope + the conversation before applying (defense-in-depth).
          if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan)
            return;
          if (row.license_key !== licenseKey) return;
          applyInsert(row);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
          filter: `license_key=eq.${licenseKey}`,
        },
        (payload) => applyUpdate(payload.new as Record<string, unknown>)
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "support_messages",
          filter: `license_key=eq.${licenseKey}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [licenseKey]);

  const applyInsert = useCallback(
    (raw: Record<string, unknown>) => {
      const incoming = rawToCamel(raw);
      // Drop internal notes for non-admin viewers (defense-in-depth)
      if (incoming.isInternal && !viewerIsAdmin) return;
      setMessages((prev) => {
        // Dedup by id
        if (prev.some((m) => m.id === incoming.id)) return prev;
        // Match optimistic by clientNonce (replace pending)
        if (incoming.clientNonce) {
          const idx = prev.findIndex((m) => m.clientNonce === incoming.clientNonce);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...incoming, status: "sent" as SupportSendStatus };
            return next;
          }
        }
        return insertSortedByCreatedAt(prev, incoming);
      });
    },
    [viewerIsAdmin]
  );

  const applyUpdate = useCallback(
    (raw: Record<string, unknown>) => {
      const incoming = rawToCamel(raw);
      // If row flipped to internal-note for non-admin → drop it locally
      if (incoming.isInternal && !viewerIsAdmin) {
        setMessages((prev) => prev.filter((m) => m.id !== incoming.id));
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === incoming.id ? { ...incoming, status: "sent" } : m
        )
      );
    },
    [viewerIsAdmin]
  );

  /* ─────────────── Send (optimistic) ─────────────── */
  const sendMessage = useCallback(
    async (
      content: string,
      senderName: string,
      opts: SendOptions = {}
    ): Promise<SupportMessage | null> => {
      if (!licenseKey) return null;
      const type = opts.type ?? "text";
      const trimmed = (content || "").trim();
      if (type === "text" && !trimmed) return null;
      if ((type === "image" || type === "audio") && !opts.mediaUrl) return null;

      const cn = nonce();
      const optimistic: SupportMessage = {
        id: cn, // temporary
        licenseKey,
        content: trimmed,
        type,
        mediaUrl: opts.mediaUrl ?? null,
        isAdmin: false, // overwritten by server response
        isSystem: false,
        senderName,
        authorLicenseKey: licenseKey,
        replyToId: opts.replyTo?.id ?? null,
        replyToName: opts.replyTo?.name ?? null,
        replyToContent: opts.replyTo?.content ?? null,
        editedAt: null,
        deleted: false,
        unsentBy: null,
        unsentAt: null,
        isInternal: opts.isInternal ?? false,
        createdAt: new Date().toISOString(),
        clientNonce: cn,
        status: "sending",
      };

      setMessages((prev) => capPending([...prev, optimistic]));

      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey,
            content: trimmed,
            senderName,
            type,
            mediaUrl: opts.mediaUrl ?? null,
            replyToId: opts.replyTo?.id ?? null,
            replyToName: opts.replyTo?.name ?? null,
            replyToContent: opts.replyTo?.content ?? null,
            isInternal: opts.isInternal ?? false,
            clientNonce: cn,
          }),
        });

        if (!res.ok) {
          markFailedByNonce(setMessages, cn);
          return null;
        }

        const data = await res.json();
        const sent = data.message as SupportMessage | undefined;
        if (sent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientNonce === cn ? { ...sent, status: "sent" as SupportSendStatus } : m
            )
          );
          return sent;
        }
        return null;
      } catch {
        markFailedByNonce(setMessages, cn);
        return null;
      }
    },
    [licenseKey]
  );

  /* ─────────────── Edit ─────────────── */
  const editMessage = useCallback(
    async (id: string, content: string) => {
      const trimmed = content.trim().slice(0, 2000);
      if (!trimmed) return { ok: false, error: "Empty" };
      try {
        const res = await fetch(`/api/support/messages/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: data.error, code: data.code };
        }
        const data = await res.json();
        const updated = data.message as SupportMessage | undefined;
        if (updated) {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    []
  );

  /* ─────────────── Unsend (admin only - server enforces) ─────────────── */
  const unsendMessage = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(
          `/api/support/messages/${encodeURIComponent(id)}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: data.error };
        }
        const data = await res.json();
        const updated = data.message as SupportMessage | undefined;
        if (updated) {
          // Optimistic local update - realtime UPDATE event will reconcile
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    []
  );

  /* ─────────────── Retry / remove failed ─────────────── */
  const retryFailed = useCallback(
    async (clientNonce: string, senderName: string) => {
      const target = messages.find((m) => m.clientNonce === clientNonce);
      if (!target || !licenseKey) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientNonce === clientNonce ? { ...m, status: "sending" } : m
        )
      );
      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey,
            content: target.content,
            senderName,
            type: target.type,
            mediaUrl: target.mediaUrl,
            replyToId: target.replyToId,
            replyToName: target.replyToName,
            replyToContent: target.replyToContent,
            clientNonce,
          }),
        });
        if (!res.ok) {
          markFailedByNonce(setMessages, clientNonce);
          return;
        }
        const data = await res.json();
        const sent = data.message as SupportMessage | undefined;
        if (sent) {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientNonce === clientNonce ? { ...sent, status: "sent" } : m
            )
          );
        }
      } catch {
        markFailedByNonce(setMessages, clientNonce);
      }
    },
    [licenseKey, messages]
  );

  const removeFailed = useCallback((clientNonce: string) => {
    setMessages((prev) => prev.filter((m) => m.clientNonce !== clientNonce));
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    unsendMessage,
    retryFailed,
    removeFailed,
  };
}

/* ─────────────── Helpers ─────────────── */

function markFailedByNonce(
  setter: React.Dispatch<React.SetStateAction<SupportMessage[]>>,
  cn: string
) {
  setter((prev) =>
    prev.map((m) => (m.clientNonce === cn ? { ...m, status: "error" } : m))
  );
}

function rawToCamel(raw: Record<string, unknown>): SupportMessage {
  const r = raw as {
    id: string;
    license_key: string;
    content?: string;
    type?: string;
    media_url?: string | null;
    is_admin?: boolean;
    is_system?: boolean;
    sender_name?: string;
    author_license_key?: string | null;
    reply_to_id?: string | null;
    reply_to_name?: string | null;
    reply_to_content?: string | null;
    edited_at?: string | null;
    deleted?: boolean;
    unsent_by?: string | null;
    unsent_at?: string | null;
    is_internal?: boolean;
    client_nonce?: string | null;
    created_at: string;
  };

  let type = (r.type ?? "text") as SupportMessage["type"];
  let content = r.content ?? "";
  let mediaUrl = r.media_url ?? null;

  if (type === "text" && content.startsWith("[image]")) {
    const lines = content.split("\n");
    mediaUrl = lines[0].slice(7);
    content = lines.slice(1).join("\n");
    type = "image";
  }
  if (r.is_system) type = "system";

  return {
    id: r.id,
    licenseKey: r.license_key,
    content,
    type,
    mediaUrl,
    isAdmin: Boolean(r.is_admin),
    isSystem: Boolean(r.is_system),
    senderName: r.sender_name ?? "",
    authorLicenseKey: r.author_license_key ?? null,
    replyToId: r.reply_to_id ?? null,
    replyToName: r.reply_to_name ?? null,
    replyToContent: r.reply_to_content ?? null,
    editedAt: r.edited_at ?? null,
    deleted: Boolean(r.deleted),
    unsentBy: r.unsent_by ?? null,
    unsentAt: r.unsent_at ?? null,
    isInternal: Boolean(r.is_internal),
    createdAt: r.created_at,
    clientNonce: r.client_nonce ?? undefined,
  };
}

function insertSortedByCreatedAt(prev: SupportMessage[], incoming: SupportMessage): SupportMessage[] {
  const t = new Date(incoming.createdAt).getTime();
  // Common case: append (newest)
  if (prev.length === 0 || t >= new Date(prev[prev.length - 1].createdAt).getTime()) {
    return [...prev, incoming];
  }
  // Otherwise binary-insert
  let lo = 0;
  let hi = prev.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (new Date(prev[mid].createdAt).getTime() <= t) lo = mid + 1;
    else hi = mid;
  }
  return [...prev.slice(0, lo), incoming, ...prev.slice(lo)];
}

function mergeServerWithPending(
  server: SupportMessage[],
  prev: SupportMessage[]
): SupportMessage[] {
  // Keep optimistic pending/error messages that have no corresponding server row
  const pending = prev.filter(
    (m) => m.status === "sending" || m.status === "error"
  );
  const ids = new Set(server.map((m) => m.id));
  const nonces = new Set(server.map((m) => m.clientNonce).filter(Boolean) as string[]);
  const survivedPending = pending.filter(
    (m) => !ids.has(m.id) && !(m.clientNonce && nonces.has(m.clientNonce))
  );
  const merged = [...server, ...survivedPending];
  merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  return merged;
}

function capPending(arr: SupportMessage[]): SupportMessage[] {
  // Cap pending+error count (oldest first); preserve sent/regular
  const pendingIdx = arr
    .map((m, i) => ({ m, i }))
    .filter((x) => x.m.status === "sending" || x.m.status === "error");
  if (pendingIdx.length <= PENDING_CAP) return arr;
  const overflow = pendingIdx.length - PENDING_CAP;
  const drop = new Set(pendingIdx.slice(0, overflow).map((x) => x.i));
  return arr.filter((_, i) => !drop.has(i));
}
