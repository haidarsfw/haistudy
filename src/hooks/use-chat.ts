"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { ChatMessage } from "@/types";

export function useChat() {
  const { session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const lastSendTime = useRef(0);

  // Unread tracking with localStorage persistence
  const LAST_READ_KEY = "hs-chat-last-read";
  const [lastReadAt, setLastReadAt] = useState<string>(() => {
    if (typeof window === "undefined") return new Date(0).toISOString();
    return localStorage.getItem(LAST_READ_KEY) || new Date(0).toISOString();
  });

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastReadAt(now);
    try { localStorage.setItem(LAST_READ_KEY, now); } catch {}
  }, []);

  // Fetch initial messages (latest batch)
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setHasMore(data.messages.length >= 100);
      }
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch older messages (lazy load on scroll up)
  const fetchMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return;
    setIsLoadingMore(true);
    try {
      const oldestId = messages[0].id;
      const res = await fetch(`/api/chat/messages?before=${encodeURIComponent(oldestId)}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          return [...newMsgs, ...prev];
        });
        setHasMore(data.messages.length >= 100);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to fetch more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, messages]);

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

        // Mention notifications are now handled server-side in the chat API

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

  // Clear all messages (admin only)
  const clearChat = useCallback(async () => {
    if (!session?.isAdmin) return;
    const res = await fetch("/api/chat/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearAll: true }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal menghapus semua pesan");
    }

    // Always clear local state after successful server-side clear
    setMessages([]);
    setPinnedIds([]);
  }, [session]);

  // Derived: pinned messages
  const pinnedMessages = messages.filter((m) => pinnedIds.includes(m.id));

  // Derived: unread count (messages after lastReadAt, excluding own and deleted)
  const deviceId = typeof window !== "undefined" ? getDeviceId() : "";
  const unreadCount = messages.filter(
    (m) => !m.deleted && m.createdAt > lastReadAt && m.authorId !== deviceId
  ).length;

  return {
    messages,
    pinnedMessages,
    pinnedIds,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    unreadCount,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    clearChat,
    pinMessage,
    unpinMessage,
    markAsRead,
    fetchMore,
  };
}
