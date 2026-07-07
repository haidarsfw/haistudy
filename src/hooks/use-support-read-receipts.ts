"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { supportReadReceiptsChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import type { SupportReadReceipt, SupportReaderKind } from "@/types";

export interface UseSupportReceiptsResult {
  receiptsByMessage: Map<string, SupportReadReceipt[]>;
  markReadUpTo: (messageId: string) => Promise<void>;
}

function rawToCamel(raw: Record<string, unknown>): SupportReadReceipt {
  const r = raw as {
    id: string;
    license_key: string;
    message_id: string;
    reader_kind: SupportReaderKind;
    read_at: string;
  };
  return {
    id: r.id,
    licenseKey: r.license_key,
    messageId: r.message_id,
    readerKind: r.reader_kind,
    readAt: r.read_at,
  };
}

export function useSupportReadReceipts(licenseKey: string | null): UseSupportReceiptsResult {
  const [byMsg, setByMsg] = useState<Map<string, SupportReadReceipt[]>>(new Map());
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastMarkedRef = useRef<string | null>(null);

  // Reset state when conversation changes
  useEffect(() => {
    setByMsg(new Map());
    lastMarkedRef.current = null;
  }, [licenseKey]);

  /* ── Initial load ── */
  useEffect(() => {
    if (!licenseKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/support/read?licenseKey=${encodeURIComponent(licenseKey)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const arr = (data.receipts || []) as SupportReadReceipt[];
        const m = new Map<string, SupportReadReceipt[]>();
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
      .channel(supportReadReceiptsChannel(scope, licenseKey))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_read_receipts",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          // postgres_changes filters semester only — cross-check scope + convo.
          if (
            scopeCtx?.scope &&
            (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan)
          )
            return;
          if (row.license_key !== licenseKey) return;
          const r = rawToCamel(row);
          setByMsg((prev) => {
            const next = new Map(prev);
            const list = next.get(r.messageId) ?? [];
            if (list.some((x) => x.id === r.id)) return prev;
            next.set(r.messageId, [...list, r]);
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

  /* ── Mark-read ── */
  const markReadUpTo = useCallback(
    async (messageId: string) => {
      if (!licenseKey || !messageId) return;
      // Skip if we already marked up to this exact message (idempotent dedup)
      if (lastMarkedRef.current === messageId) return;
      lastMarkedRef.current = messageId;
      try {
        const res = await fetch("/api/support/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseKey, upToMessageId: messageId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const fresh = (data.receipts || []) as SupportReadReceipt[];
        if (fresh.length === 0) return;
        setByMsg((prev) => {
          const next = new Map(prev);
          for (const r of fresh) {
            const list = next.get(r.messageId) ?? [];
            if (list.some((x) => x.id === r.id)) continue;
            next.set(r.messageId, [...list, r]);
          }
          return next;
        });
      } catch {
        // silent
      }
    },
    [licenseKey]
  );

  return { receiptsByMessage: byMsg, markReadUpTo };
}
