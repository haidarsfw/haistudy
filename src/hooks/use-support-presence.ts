"use client";

import { useEffect, useState } from "react";
import type { SupportPresenceState, SupportReaderKind } from "@/types";

const POLL_INTERVAL_MS = 15_000;

/**
 * Read presence of the OTHER side of a support conversation.
 * - User panel: pass licenseKey=null → polls /api/support/presence (no qs) → admin aggregate
 * - Admin panel: pass licenseKey=<conversation owner> → polls per-conversation
 *
 * Server is the single source of truth for `online` (derived from last_seen
 * freshness). No client-side decay timer - that caused flicker against the
 * server's authoritative response.
 */
export function useSupportPresence(
  licenseKey: string | null,
  kind: SupportReaderKind
): { presence: SupportPresenceState } {
  const [presence, setPresence] = useState<SupportPresenceState>({
    online: false,
    lastSeen: null,
    kind,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      try {
        const url = licenseKey
          ? `/api/support/presence?licenseKey=${encodeURIComponent(licenseKey)}`
          : "/api/support/presence";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setPresence({
          online: Boolean(data.online),
          lastSeen: data.lastSeen ?? null,
          kind: (data.kind ?? kind) as SupportReaderKind,
        });
      } catch {
        // silent
      }
    };

    fetchOnce();
    timer = setInterval(fetchOnce, POLL_INTERVAL_MS);

    // Refetch immediately when tab regains focus
    const onVis = () => {
      if (!document.hidden) fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [licenseKey, kind]);

  return { presence };
}
