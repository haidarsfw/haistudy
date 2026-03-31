"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { parseMentions, hasMentions } from "@/lib/mentions";
import type { ChatMessage } from "@/types";

export function useChat() {
  const { session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const lastSendTime = useRef(0);

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch pinned message IDs
  const fetchPins = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/pins");
      const data = await res.json();
      if (data.pinnedIds) setPinnedIds(data.pinnedIds);
    } catch (error) {
      console.error("Failed to fetch pinned messages:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchMessages();
    fetchPins();
  }, [fetchMessages, fetchPins]);

  // Supabase Realtime subscription for new messages
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const row = payload.new;
          const message: ChatMessage = {
            id: row.id,
            content: row.content,
            type: row.type,
            mediaUrl: row.media_url,
            authorId: row.author_id,
            authorName: row.author_name,
            authorClass: row.author_class,
            isAdmin: row.is_admin,
            isTester: row.is_tester,
            packageTier: row.package_tier || undefined,
            deleted: row.deleted,
            replyToId: row.reply_to_id,
            replyToName: row.reply_to_name,
            replyToContent: row.reply_to_content,
            createdAt: row.created_at,
          };
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const row = payload.new;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? {
                    ...m,
                    deleted: row.deleted,
                    content: row.content,
                    mediaUrl: row.media_url,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    // Pinned messages channel
    const pinsChannel = supabase
      .channel("pinned-messages")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
        },
        () => fetchPins()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(pinsChannel);
    };
  }, [fetchPins]);

  // Send a text message
  const sendMessage = useCallback(
    async (
      content: string,
      replyTo?: { id: string; name: string; content: string } | null
    ) => {
      if (!session || !content.trim()) return;

      // Rate limit
      const now = Date.now();
      if (now - lastSendTime.current < RATE_LIMITS.CHAT_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum mengirim pesan");
      }

      setIsSending(true);
      try {
        const deviceId = getDeviceId();
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            type: "text",
            authorId: deviceId,
            authorName: session.name,
            authorClass: session.selectedClass,
            isAdmin: session.isAdmin,
            isTester: session.isTester,
            packageTier: session.packageTier,
            replyToId: replyTo?.id || null,
            replyToName: replyTo?.name || null,
            replyToContent: replyTo?.content || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengirim pesan");
        }

        lastSendTime.current = Date.now();

        // Send mention notifications
        if (hasMentions(content)) {
          const mentions = parseMentions(content);
          if (mentions.length > 0) {
            // For @all, admin only
            const hasAll = mentions.some((m) => m.isAll);
            if (hasAll && !session.isAdmin) {
              // Skip @all for non-admin
            } else {
              // Fire and forget notification creation
              fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  notifications: mentions
                    .filter((m) => !m.isAll || session.isAdmin)
                    .map((m) => ({
                      // For individual mentions, we pass the username
                      // The server-side or client-side resolution happens at display time
                      licenseKey: `@${m.username}`, // placeholder - resolved by notification system
                      type: m.isAll ? "mention_all" : "mention",
                      senderName: session.name,
                      preview: content.slice(0, 100),
                      context: "chat" as const,
                    })),
                }),
              }).catch(() => {});
            }
          }
        }

        // In mock mode, refetch
        if (!isSupabaseConfigured) {
          await fetchMessages();
        }
      } finally {
        setIsSending(false);
      }
    },
    [session, fetchMessages]
  );

  // Send an image message (with optional caption and reply)
  const sendImage = useCallback(
    async (file: File, caption?: string, replyTo?: { id: string; name: string; content: string }) => {
      if (!session) return;

      setIsSending(true);
      try {
        const url = await uploadToCloudinary(file);
        if (!url) throw new Error("Upload gagal");

        const deviceId = getDeviceId();
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: caption || "",
            type: "image",
            mediaUrl: url,
            authorId: deviceId,
            authorName: session.name,
            authorClass: session.selectedClass,
            isAdmin: session.isAdmin,
            isTester: session.isTester,
            packageTier: session.packageTier,
            replyToId: replyTo?.id || null,
            replyToName: replyTo?.name || null,
            replyToContent: replyTo?.content || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengirim gambar");
        }

        lastSendTime.current = Date.now();

        if (!isSupabaseConfigured) {
          await fetchMessages();
        }
      } finally {
        setIsSending(false);
      }
    },
    [session, fetchMessages]
  );

  // Send an audio (voice note) message
  const sendAudio = useCallback(
    async (blob: Blob, replyTo?: { id: string; name: string; content: string } | null) => {
      if (!session) return;

      const now = Date.now();
      if (now - lastSendTime.current < RATE_LIMITS.CHAT_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum mengirim pesan");
      }

      setIsSending(true);
      try {
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        const url = await uploadToCloudinary(file, "auto");
        if (!url) throw new Error("Upload gagal");

        const deviceId = getDeviceId();
        const res = await fetch("/api/chat/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "",
            type: "audio",
            mediaUrl: url,
            authorId: deviceId,
            authorName: session.name,
            authorClass: session.selectedClass,
            isAdmin: session.isAdmin,
            isTester: session.isTester,
            packageTier: session.packageTier,
            replyToId: replyTo?.id || null,
            replyToName: replyTo?.name || null,
            replyToContent: replyTo?.content || null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal mengirim voice note");
        }

        lastSendTime.current = Date.now();

        if (!isSupabaseConfigured) {
          await fetchMessages();
        }
      } finally {
        setIsSending(false);
      }
    },
    [session, fetchMessages]
  );

  // Delete (soft) a message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!session) return;
      const deviceId = getDeviceId();
      const res = await fetch("/api/chat/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          requesterId: deviceId,
          isAdmin: session.isAdmin,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus pesan");
      }

      if (!isSupabaseConfigured) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deleted: true, content: "", mediaUrl: null }
              : m
          )
        );
      }
    },
    [session]
  );

  // Pin a message (admin only)
  const pinMessage = useCallback(
    async (messageId: string) => {
      if (!session?.isAdmin) return;
      const deviceId = getDeviceId();
      const res = await fetch("/api/chat/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          pinnedBy: deviceId,
          isAdmin: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal pin pesan");
      }

      if (!isSupabaseConfigured) {
        setPinnedIds((prev) => [messageId, ...prev]);
      }
    },
    [session]
  );

  // Unpin a message (admin only)
  const unpinMessage = useCallback(
    async (messageId: string) => {
      if (!session?.isAdmin) return;
      const res = await fetch("/api/chat/pins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, isAdmin: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal unpin pesan");
      }

      if (!isSupabaseConfigured) {
        setPinnedIds((prev) => prev.filter((id) => id !== messageId));
      }
    },
    [session]
  );

  // Derived: pinned messages
  const pinnedMessages = messages.filter((m) => pinnedIds.includes(m.id));

  return {
    messages,
    pinnedMessages,
    pinnedIds,
    isLoading,
    isSending,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    pinMessage,
    unpinMessage,
  };
}
