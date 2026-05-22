"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { chatChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";

/**
 * Track unread chat message count.
 * Uses localStorage to store last-read message ID.
 * Updates when new messages arrive via Realtime.
 */
export function useUnreadChatCount() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [unreadCount, setUnreadCount] = useState(0);
  const lastReadIdRef = useRef<string | null>(null);
  const isOpenRef = useRef(false);

  // Load last-read position from localStorage
  useEffect(() => {
    if (!session) return;
    const key = `hs-chat-last-read-${session.licenseKey}`;
    lastReadIdRef.current = localStorage.getItem(key);
  }, [session]);

  // Mark chat as read (call when panel opens/is-visible)
  const markChatAsRead = useCallback(
    (latestMessageId: string | null) => {
      if (!session || !latestMessageId) return;
      const key = `hs-chat-last-read-${session.licenseKey}`;
      lastReadIdRef.current = latestMessageId;
      localStorage.setItem(key, latestMessageId);
      setUnreadCount(0);
    },
    [session]
  );

  // Set whether chat is currently open
  const setChatOpen = useCallback((open: boolean) => {
    isOpenRef.current = open;
    if (open) setUnreadCount(0);
  }, []);

  // Listen for new messages to increment unread count
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`${chatChannel(scope)}:unread`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          const deviceId = localStorage.getItem("hs-device-id");
          // Don't count own messages
          if (payload.new.author_id === deviceId) return;
          // Don't count if chat is open
          if (isOpenRef.current) return;
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope]);

  return { unreadCount, markChatAsRead, setChatOpen };
}
