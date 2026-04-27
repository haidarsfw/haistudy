"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  SUPPORT_TYPING_CLEAR_MS,
  SUPPORT_TYPING_DEBOUNCE_MS,
} from "@/lib/constants";
import type { SupportTypingState, SupportReaderKind } from "@/types";

export interface UseSupportTypingResult {
  typing: SupportTypingState | null;
  notifyTyping: () => void;
}

/**
 * Subscribes to support:typing:<licenseKey> broadcast channel.
 *  - `myKind`: which side I am (admin/user).
 *  - `myLicenseKey`: my own license_key — used as primary self-filter; works
 *    even when admin opens user-side panel (kind=admin from server but myKind="user").
 *  - `notifyTyping()`: debounced server-side broadcast (single in-flight request
 *    per debounce window).
 */
export function useSupportTyping(
  licenseKey: string | null,
  myKind: SupportReaderKind,
  myLicenseKey: string | null
): UseSupportTypingResult {
  const [typing, setTyping] = useState<SupportTypingState | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNotifyRef = useRef(0);

  /* ── Subscribe to broadcast ── */
  useEffect(() => {
    if (!licenseKey || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`support:typing:${licenseKey}`)
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as {
          kind?: SupportReaderKind;
          name?: string;
          startedAt?: string;
          senderKey?: string;
        };
        if (!data?.kind) return;
        // Primary self-filter: by senderKey identity. Robust for admin in
        // user-panel (kind=admin but senderKey===myLicenseKey).
        if (data.senderKey) {
          if (myLicenseKey && data.senderKey === myLicenseKey) return;
        } else if (data.kind === myKind) {
          // Backward compat: old payload (mid-deploy) — fall back to kind filter.
          return;
        }
        setTyping({
          isTyping: true,
          fromKind: data.kind,
          fromName: data.name ?? "",
          startedAt: data.startedAt ?? new Date().toISOString(),
        });
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          setTyping(null);
        }, SUPPORT_TYPING_CLEAR_MS);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [licenseKey, myKind, myLicenseKey]);

  /* ── Sender side: notify server ── */
  const notifyTyping = useCallback(() => {
    if (!licenseKey) return;
    const now = Date.now();
    if (now - lastNotifyRef.current < SUPPORT_TYPING_DEBOUNCE_MS) return;
    lastNotifyRef.current = now;
    fetch("/api/support/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey }),
    }).catch(() => {
      // silent — typing isn't critical
    });
  }, [licenseKey]);

  return { typing, notifyTyping };
}
