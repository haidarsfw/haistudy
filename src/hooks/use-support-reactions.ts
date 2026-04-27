"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SupportReaction } from "@/types";

export interface UseSupportReactionsResult {
  reactionsByMessage: Map<string, SupportReaction[]>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  isInflight: (messageId: string, emoji: string) => boolean;
}

function rawToCamel(raw: Record<string, unknown>): SupportReaction {
  const r = raw as {
    id: string;
    message_id: string;
    license_key: string;
    reactor_key: string;
    reactor_name: string;
    is_admin?: boolean;
    emoji: string;
    created_at: string;
  };
  return {
    id: r.id,
    messageId: r.message_id,
    licenseKey: r.license_key,
    reactorKey: r.reactor_key,
    reactorName: r.reactor_name,
    isAdmin: Boolean(r.is_admin),
    emoji: r.emoji,
    createdAt: r.created_at,
  };
}

export function useSupportReactions(
  licenseKey: string | null,
  myKey: string | null
): UseSupportReactionsResult {
  const [byMsg, setByMsg] = useState<Map<string, SupportReaction[]>>(new Map());
  const inflightRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [, setTick] = useState(0); // forces re-render when inflight set changes

  /* ── Initial load ── */
  useEffect(() => {
    if (!licenseKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/support/reactions?licenseKey=${encodeURIComponent(licenseKey)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const arr = (data.reactions || []) as SupportReaction[];
        if (cancelled) return;
        const m = new Map<string, SupportReaction[]>();
        for (const r of arr) {
          const list = m.get(r.messageId) ?? [];
          list.push(r);
          m.set(r.messageId, list);
        }
        setByMsg(m);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [licenseKey]);

  /* ── Realtime ── */
  useEffect(() => {
    if (!licenseKey || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`support:rxn:${licenseKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_reactions",
          filter: `license_key=eq.${licenseKey}`,
        },
        (payload) => {
          const r = rawToCamel(payload.new as Record<string, unknown>);
          setByMsg((prev) => {
            const next = new Map(prev);
            const list = next.get(r.messageId) ?? [];
            // Dedup by id AND by (reactor_key, emoji) — server-side UNIQUE
            // guarantees uniqueness, this guards optimistic-then-realtime races.
            if (
              list.some(
                (x) =>
                  x.id === r.id ||
                  (x.reactorKey === r.reactorKey && x.emoji === r.emoji)
              )
            ) {
              // If we have the optimistic copy, replace with server-canonical
              const idx = list.findIndex(
                (x) => x.reactorKey === r.reactorKey && x.emoji === r.emoji
              );
              if (idx >= 0 && list[idx].id !== r.id) {
                const newList = [...list];
                newList[idx] = r;
                next.set(r.messageId, newList);
                return next;
              }
              return prev;
            }
            next.set(r.messageId, [...list, r]);
            return next;
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "support_reactions",
          filter: `license_key=eq.${licenseKey}`,
        },
        (payload) => {
          const old = payload.old as { id?: string; message_id?: string };
          if (!old?.id) return;
          setByMsg((prev) => {
            const next = new Map(prev);
            // We may not have message_id in the OLD payload depending on
            // REPLICA IDENTITY — sweep all keys
            for (const [k, list] of next) {
              const filtered = list.filter((x) => x.id !== old.id);
              if (filtered.length !== list.length) {
                next.set(k, filtered);
              }
            }
            return next;
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [licenseKey]);

  /* ── Optimistic toggle ── */
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      const key = `${messageId}::${emoji}`;
      if (inflightRef.current.has(key)) return;
      inflightRef.current.add(key);
      setTick((t) => t + 1);

      // Snapshot existing — if my reaction with this emoji already exists,
      // we are removing it; else adding it.
      const existing = (byMsg.get(messageId) ?? []).find(
        (r) => r.reactorKey === myKey && r.emoji === emoji
      );

      // Optimistic: apply immediately
      setByMsg((prev) => {
        const next = new Map(prev);
        const list = next.get(messageId) ?? [];
        if (existing) {
          next.set(
            messageId,
            list.filter((x) => x.id !== existing.id)
          );
        } else if (myKey) {
          // Insert temp reaction with synthetic id
          const temp: SupportReaction = {
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            messageId,
            licenseKey: licenseKey ?? "",
            reactorKey: myKey,
            reactorName: "",
            isAdmin: false,
            emoji,
            createdAt: new Date().toISOString(),
          };
          next.set(messageId, [...list, temp]);
        }
        return next;
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8_000);
      try {
        const res = await fetch(
          `/api/support/messages/${encodeURIComponent(messageId)}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emoji }),
            credentials: "same-origin",
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        if (!res.ok) {
          let body = "";
          try {
            body = await res.text();
          } catch {
            // ignore
          }
          console.warn(
            "[support reactions] toggle failed",
            res.status,
            body.slice(0, 200)
          );
          // Rollback: restore previous state for this (messageId, emoji)
          setByMsg((prev) => {
            const next = new Map(prev);
            const list = next.get(messageId) ?? [];
            if (existing) {
              // Re-add it
              if (!list.some((x) => x.id === existing.id)) {
                next.set(messageId, [...list, existing]);
              }
            } else if (myKey) {
              // Remove our temp insert
              next.set(
                messageId,
                list.filter(
                  (x) => !(x.reactorKey === myKey && x.emoji === emoji)
                )
              );
            }
            return next;
          });
          return;
        }
        // Server canonical state will arrive via realtime; the dedup logic
        // in the INSERT handler upgrades temp → real.
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn("[support reactions] network/abort", err);
        // Rollback on network failure
        setByMsg((prev) => {
          const next = new Map(prev);
          const list = next.get(messageId) ?? [];
          if (existing) {
            if (!list.some((x) => x.id === existing.id)) {
              next.set(messageId, [...list, existing]);
            }
          } else if (myKey) {
            next.set(
              messageId,
              list.filter((x) => !(x.reactorKey === myKey && x.emoji === emoji))
            );
          }
          return next;
        });
      } finally {
        inflightRef.current.delete(key);
        setTick((t) => t + 1);
      }
    },
    [byMsg, licenseKey, myKey]
  );

  const isInflight = useCallback(
    (messageId: string, emoji: string) =>
      inflightRef.current.has(`${messageId}::${emoji}`),
    []
  );

  return { reactionsByMessage: byMsg, toggleReaction, isInflight };
}
