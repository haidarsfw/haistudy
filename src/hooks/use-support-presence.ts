"use client";

import { useEffect, useState } from "react";
import type { SupportPresenceState, SupportReaderKind } from "@/types";
import { SUPPORT_PRESENCE_STALE_MS } from "@/lib/constants";

const POLL_INTERVAL_MS = 30_000;

/**
 * Read presence of the OTHER side of a support conversation.
 * - User panel: pass licenseKey=null → polls /api/support/presence (no qs) → admin aggregate
 * - Admin panel: pass licenseKey=<conversation owner> → polls per-conversation
 *
 * `kind` reflects which side we're reading.
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
        const res = await fetch(url);
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

    // Decay: if we know lastSeen, re-evaluate "online" client-side every 30s
    // even without a new server poll (covers stale presence).
    const decay = setInterval(() => {
      setPresence((prev) => {
        if (!prev.online || !prev.lastSeen) return prev;
        const age = Date.now() - new Date(prev.lastSeen).getTime();
        if (age > SUPPORT_PRESENCE_STALE_MS) {
          return { ...prev, online: false };
        }
        return prev;
      });
    }, 30_000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      clearInterval(decay);
    };
  }, [licenseKey, kind]);

  return { presence };
}
