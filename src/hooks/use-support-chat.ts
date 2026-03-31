"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface SupportMessage {
  id: string;
  license_key: string;
  content: string;
  is_admin: boolean;
  sender_name: string;
  created_at: string;
}

export function useSupportChat() {
  const { session } = useSession();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

  // Fetch messages
  useEffect(() => {
    if (!session?.licenseKey) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/support?licenseKey=${session.licenseKey}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [session?.licenseKey]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.licenseKey || !isSupabaseConfigured) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`support:${session.licenseKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `license_key=eq.${session.licenseKey}`,
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.licenseKey]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!session?.licenseKey || !content.trim()) return;

      try {
        const res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            content: content.trim(),
            isAdmin: session.isAdmin || false,
            senderName: session.name || "User",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) return prev;
              return [...prev, data.message];
            });
          }
        }
      } catch {
        // silent
      }
    },
    [session]
  );

  return { messages, loading, sendMessage };
}
