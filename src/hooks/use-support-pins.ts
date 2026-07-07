"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportPinsChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import type { SupportPinnedMessage } from "@/types";

const MAX_PIN = 3;

function rawToCamel(raw: Record<string, unknown>): SupportPinnedMessage {
  const r = raw as {
    id: string;
    message_id: string;
    license_key: string;
    pinned_by: string;
    pinned_at: string;
  };
  return {
    id: r.id,
    messageId: r.message_id,
    licenseKey: r.license_key,
    pinnedBy: r.pinned_by,
    pinnedAt: r.pinned_at,
  };
}

export interface UseSupportPinsResult {
  pins: SupportPinnedMessage[];
  isPinned: (messageId: string) => boolean;
  capReached: boolean;
  pin: (messageId: string) => Promise<{ ok: boolean; error?: string; code?: string }>;
  unpin: (messageId: string) => Promise<{ ok: boolean; error?: string }>;
}

/**
 * Live list of pinned messages for one support conversation.
 * Realtime INSERT/DELETE on support_pinned_messages keeps the list in sync.
 */
export function useSupportPins(licenseKey: string | null): UseSupportPinsResult {
  const [pins, setPins] = useState<SupportPinnedMessage[]>([]);
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Reset when conversation changes
  useEffect(() => {
    setPins([]);
  }, [licenseKey]);

  /* Initial fetch */
  useEffect(() => {
    if (!licenseKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/support/pins?licenseKey=${encodeURIComponent(licenseKey)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setPins((data.pins || []) as SupportPinnedMessage[]);
      } catch {
        // silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [licenseKey]);

  /* Realtime */
  useEffect(() => {
    if (!licenseKey || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(supportPinsChannel(scope, licenseKey))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_pinned_messages",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // postgres_changes filters semester only — cross-check scope + convo.
          if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan)
            return;
          if (row.license_key !== licenseKey) return;
          const p = rawToCamel(row);
          setPins((prev) => {
            if (prev.some((x) => x.id === p.id || x.messageId === p.messageId)) {
              return prev;
            }
            return [p, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "support_pinned_messages",
          filter: `license_key=eq.${licenseKey}`,
        },
        (payload) => {
          const old = payload.old as { id?: string; message_id?: string };
          setPins((prev) =>
            prev.filter(
              (x) =>
                !(old.id && x.id === old.id) &&
                !(old.message_id && x.messageId === old.message_id)
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [licenseKey]);

  const isPinned = useCallback(
    (messageId: string) => pins.some((p) => p.messageId === messageId),
    [pins]
  );

  const capReached = pins.length >= MAX_PIN;

  const pin = useCallback(
    async (messageId: string) => {
      if (!licenseKey) return { ok: false, error: "No conversation" };
      try {
        const res = await fetch("/api/support/pins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, licenseKey }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return { ok: false, error: data.error, code: data.code };
        }
        return { ok: true };
      } catch {
        return { ok: false, error: "Network error" };
      }
    },
    [licenseKey]
  );

  const unpin = useCallback(async (messageId: string) => {
    try {
      const res = await fetch("/api/support/pins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: false, error: data.error };
      }
      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  return { pins, isPinned, capReached, pin, unpin };
}
