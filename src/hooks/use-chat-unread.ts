"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { chatUnreadChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { getDeviceId } from "@/lib/auth/device";
import { canUseVipFeatures } from "@/lib/tier";
import { whenIdle } from "@/lib/defer";
import type { ChatChannel } from "@/types";

const READ_GLOBAL_KEY = "hs-chat-read-global";
const READ_VIP_KEY = "hs-chat-read-vip-lounge";
const LEGACY_KEY = "hs-chat-last-read";
const ACTIVE_EVENT = "hs:chat-active"; // dispatched by ChatPanel: { channel | null }

function readTs(key: string): string {
  if (typeof window === "undefined") return new Date(0).toISOString();
  try {
    return (
      localStorage.getItem(key) ||
      localStorage.getItem(LEGACY_KEY) ||
      new Date(0).toISOString()
    );
  } catch {
    return new Date(0).toISOString();
  }
}

function persist(key: string, ts: string) {
  try {
    localStorage.setItem(key, ts);
  } catch {
    /* ignore */
  }
}

/**
 * Always-on unread counter for the bottom-right chat icon. Counts Global + VIP
 * messages even before the chat panel has ever mounted (the in-panel useChat
 * only tracks unread while open). DM unread is tracked separately via
 * notifications. Count-only: one initial server count + one realtime topic on
 * chat_messages (already in the publication, so no extra WAL-decode cost).
 */
export function useChatUnread() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const canVip = canUseVipFeatures(session);

  const [globalUnread, setGlobalUnread] = useState(0);
  const [vipUnread, setVipUnread] = useState(0);

  const deviceIdRef = useRef("");
  const activeRef = useRef<ChatChannel | null>(null);
  const readGlobalRef = useRef(new Date(0).toISOString());
  const readVipRef = useRef(new Date(0).toISOString());
  const canVipRef = useRef(canVip);
  canVipRef.current = canVip;

  const markChannelRead = useCallback((ch: ChatChannel) => {
    const now = new Date().toISOString();
    if (ch === "vip-lounge") {
      readVipRef.current = now;
      persist(READ_VIP_KEY, now);
      setVipUnread(0);
    } else {
      readGlobalRef.current = now;
      persist(READ_GLOBAL_KEY, now);
      setGlobalUnread(0);
    }
  }, []);

  // The chat panel tells us which channel (if any) is currently being viewed.
  // Viewing a channel marks it read; closing the panel clears the active state.
  useEffect(() => {
    const onActive = (e: Event) => {
      const ch = (e as CustomEvent).detail?.channel as
        | ChatChannel
        | null
        | undefined;
      activeRef.current = ch ?? null;
      if (ch === "global" || ch === "vip-lounge") markChannelRead(ch);
    };
    window.addEventListener(ACTIVE_EVENT, onActive);
    return () => window.removeEventListener(ACTIVE_EVENT, onActive);
  }, [markChannelRead]);

  // Initial count from the server (browser can't SELECT chat_messages directly).
  useEffect(() => {
    if (!session) return;
    deviceIdRef.current = getDeviceId();
    readGlobalRef.current = readTs(READ_GLOBAL_KEY);
    readVipRef.current = readTs(READ_VIP_KEY);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/unread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: deviceIdRef.current,
            reads: {
              global: readGlobalRef.current,
              "vip-lounge": readVipRef.current,
            },
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { global?: number; vipLounge?: number };
        if (cancelled) return;
        if (activeRef.current !== "global") setGlobalUnread(data.global ?? 0);
        if (canVipRef.current && activeRef.current !== "vip-lounge") {
          setVipUnread(data.vipLounge ?? 0);
        }
      } catch {
        /* network error - badge simply stays at its current value */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, scope]);

  // Realtime: bump the matching channel when a new message lands (unless it's
  // ours or the channel is currently being viewed).
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    let cleanup: (() => void) | null = null;
    const cancelIdle = whenIdle(() => {
      const supabase = createClient();
      if (!supabase) return;
      const channel = supabase
        .channel(chatUnreadChannel(scope, session.licenseKey))
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: scopeRealtimeFilter(scope),
          },
          (payload) => {
            const row = payload.new as {
              exam_period?: string;
              jurusan?: string;
              deleted?: boolean;
              author_id?: string;
              channel?: string;
            };
            if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan)
              return;
            if (row.deleted) return;
            if (row.author_id && row.author_id === deviceIdRef.current) return;
            const ch = (row.channel || "global") as ChatChannel;
            if (ch === "vip-lounge" && !canVipRef.current) return;
            if (ch === activeRef.current) {
              markChannelRead(ch);
              return;
            }
            if (ch === "vip-lounge") setVipUnread((n) => n + 1);
            else setGlobalUnread((n) => n + 1);
          }
        )
        .subscribe();
      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelIdle();
      cleanup?.();
    };
  }, [session, scope, markChannelRead]);

  return {
    globalUnread,
    vipUnread,
    total: globalUnread + vipUnread,
  };
}
