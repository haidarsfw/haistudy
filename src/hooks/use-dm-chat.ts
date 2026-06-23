"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { dmMessagesChannel } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { RATE_LIMITS } from "@/lib/constants";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { DmConversation, DmDirectoryUser, DmMessage } from "@/types";

type ReplyTo = { id: string; name: string; content: string } | null;

// Map a realtime dm_messages row (snake_case) to the client DmMessage shape.
function rowToDm(row: Record<string, unknown>): DmMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderKey: row.sender_key as string,
    senderName: (row.sender_name as string) ?? null,
    body: (row.body as string) ?? "",
    type: ((row.type as string) ?? "text") as DmMessage["type"],
    mediaUrl: (row.media_url as string) ?? null,
    replyToId: (row.reply_to_id as string) ?? null,
    replyToName: (row.reply_to_name as string) ?? null,
    replyToBody: (row.reply_to_body as string) ?? null,
    deleted: (row.deleted as boolean) ?? false,
    pinned: (row.pinned as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

export function useDmChat() {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const myKey = (session?.licenseKey ?? "").toUpperCase();

  const [directory, setDirectory] = useState<DmDirectoryUser[]>([]);
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const lastSendTime = useRef(0);

  // activeId in a ref so the realtime handler always sees the current value.
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  // ── Directory (VIP/admin, online + offline) ──
  const fetchDirectory = useCallback(async () => {
    if (!session) return;
    setIsLoadingDirectory(true);
    try {
      const res = await fetch("/api/dm/users");
      const data = await res.json();
      setDirectory(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error("Failed to fetch DM directory:", error);
    } finally {
      setIsLoadingDirectory(false);
    }
  }, [session]);

  // ── Conversations list ──
  const fetchConversations = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/dm/conversations");
      const data = await res.json();
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (error) {
      console.error("Failed to fetch DM conversations:", error);
    }
  }, [session]);

  // ── Messages for the active conversation ──
  const fetchMessages = useCallback(async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/dm/conversations/${encodeURIComponent(conversationId)}/messages`
      );
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      setOtherLastReadAt(
        typeof data.otherLastReadAt === "string" ? data.otherLastReadAt : null
      );
    } catch (error) {
      console.error("Failed to fetch DM messages:", error);
      setMessages([]);
      setOtherLastReadAt(null);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Mark a conversation read (last-read pointer) — called on open/focus + when a
  // message arrives in the open thread. Optimistically clears the list unread.
  const markRead = useCallback(async (conversationId: string) => {
    try {
      await fetch(
        `/api/dm/conversations/${encodeURIComponent(conversationId)}/read`,
        { method: "POST" }
      );
    } catch {
      /* best-effort */
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unread: false } : c))
    );
    // Let the shell clear any DM notifications for this thread (red-dot sync).
    window.dispatchEvent(
      new CustomEvent("hs:dm-read", { detail: { conversationId } })
    );
  }, []);
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  useEffect(() => {
    if (!session) return;
    fetchConversations();
  }, [session, fetchConversations]);

  useEffect(() => {
    if (activeId) {
      fetchMessages(activeId);
      markRead(activeId);
    } else {
      setMessages([]);
      setOtherLastReadAt(null);
    }
  }, [activeId, fetchMessages, markRead]);

  // Sync the active thread's read-receipt pointer from the (realtime-refreshed)
  // conversation list, and poll lightly while a thread is open + visible — there
  // is no realtime on dm_reads (keeps Disk IO down).
  useEffect(() => {
    if (!activeId) return;
    const c = conversations.find((x) => x.id === activeId);
    if (c && c.otherLastReadAt !== undefined) {
      setOtherLastReadAt(c.otherLastReadAt ?? null);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const iv = setInterval(() => {
      if (!document.hidden) fetchConversations();
    }, 20000);
    return () => clearInterval(iv);
  }, [activeId, fetchConversations]);

  // ── Open or create a 1:1 with a directory user ──
  const openConversationWith = useCallback(
    async (targetKey: string): Promise<string | null> => {
      if (!session) return null;
      // Reuse an existing conversation if we already have one.
      const existing = conversations.find((c) => c.otherKey === targetKey);
      if (existing) {
        setActiveId(existing.id);
        return existing.id;
      }
      try {
        const res = await fetch("/api/dm/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: targetKey }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const conv = data.conversation as DmConversation | undefined;
        if (!conv) return null;
        setConversations((prev) =>
          prev.some((c) => c.id === conv.id) ? prev : [conv, ...prev]
        );
        setActiveId(conv.id);
        return conv.id;
      } catch (error) {
        console.error("Failed to open DM conversation:", error);
        return null;
      }
    },
    [session, conversations]
  );

  // ── Low-level POST helper shared by text / image / audio sends ──
  const postMessage = useCallback(
    async (payload: {
      body?: string;
      type?: "text" | "image" | "audio";
      mediaUrl?: string | null;
      replyTo?: ReplyTo;
    }) => {
      if (!session || !activeId) return;
      const res = await fetch(
        `/api/dm/conversations/${encodeURIComponent(activeId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            senderName: session.shortName,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal mengirim pesan");
      }
      lastSendTime.current = Date.now();
      const data = await res.json();
      const msg = data.message as DmMessage | undefined;
      if (msg) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      }
      // Refresh conversation ordering / last-body preview.
      fetchConversations();
    },
    [session, activeId, fetchConversations]
  );

  // ── Send a text message in the active conversation ──
  const sendMessage = useCallback(
    async (body: string, replyTo?: ReplyTo) => {
      if (!session || !activeId || !body.trim()) return;
      const now = Date.now();
      if (now - lastSendTime.current < RATE_LIMITS.CHAT_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum mengirim pesan");
      }
      setIsSending(true);
      try {
        await postMessage({ body: body.trim(), type: "text", replyTo });
      } finally {
        setIsSending(false);
      }
    },
    [session, activeId, postMessage]
  );

  // ── Send an image (Cloudinary upload → image message) ──
  const sendImage = useCallback(
    async (file: File, caption?: string, replyTo?: ReplyTo) => {
      if (!session || !activeId) return;
      setIsSending(true);
      try {
        const url = await uploadToCloudinary(file, "image");
        if (!url) throw new Error("Gagal mengunggah gambar");
        await postMessage({
          body: caption?.trim() || "",
          type: "image",
          mediaUrl: url,
          replyTo,
        });
      } finally {
        setIsSending(false);
      }
    },
    [session, activeId, postMessage]
  );

  // ── Send a voice note (Cloudinary "video" resource → audio message) ──
  const sendAudio = useCallback(
    async (blob: Blob) => {
      if (!session || !activeId) return;
      setIsSending(true);
      try {
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: blob.type || "audio/webm",
        });
        const url = await uploadToCloudinary(file, "video");
        if (!url) throw new Error("Gagal mengunggah pesan suara");
        await postMessage({ body: "", type: "audio", mediaUrl: url });
      } finally {
        setIsSending(false);
      }
    },
    [session, activeId, postMessage]
  );

  // ── Soft-delete a message (sender or admin) ──
  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!session || !activeId) return;
      const res = await fetch(
        `/api/dm/conversations/${encodeURIComponent(activeId)}/messages`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        }
      );
      if (!res.ok) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deleted: true, body: "", mediaUrl: null }
            : m
        )
      );
    },
    [session, activeId]
  );

  // ── Toggle pin (either participant) ──
  const setPin = useCallback(
    async (messageId: string, pinned: boolean) => {
      if (!session || !activeId) return;
      const res = await fetch(
        `/api/dm/conversations/${encodeURIComponent(activeId)}/messages`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, pinned }),
        }
      );
      if (!res.ok) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, pinned } : m))
      );
    },
    [session, activeId]
  );

  const pinMessage = useCallback(
    (id: string) => setPin(id, true),
    [setPin]
  );
  const unpinMessage = useCallback(
    (id: string) => setPin(id, false),
    [setPin]
  );

  // ── Realtime: new DM messages in this scope ──
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(dmMessagesChannel(scope))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          // No postgres_changes `filter`: dm_messages has default (PK-only)
          // replica identity, so a semester filter is rejected ("invalid column
          // for filter semester") and the client retries forever. RLS
          // (dm_is_participant) already scopes delivery to this user's
          // conversations; we cross-check exam_period/jurusan client-side below.
        },
        (payload) => {
          const row = payload.new;
          // Cross-check scope client-side (no server-side realtime filter).
          if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan) {
            return;
          }
          // Only append to the open conversation; bump the list otherwise.
          if (row.conversation_id === activeIdRef.current) {
            const msg = rowToDm(row);
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
            // Thread is open → immediately mark the incoming message as read.
            if (msg.senderKey.toUpperCase() !== myKey) {
              markReadRef.current?.(row.conversation_id as string);
            }
          }
          // Keep the conversation list fresh (ordering + previews + unread).
          fetchConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "dm_messages",
          // No filter (see INSERT binding above) — RLS scopes delivery.
        },
        (payload) => {
          const row = payload.new;
          if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan) {
            return;
          }
          // Reflect soft-deletes and pin toggles from the other participant.
          if (row.conversation_id === activeIdRef.current) {
            const msg = rowToDm(row);
            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? msg : m))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope, session, fetchConversations]);

  const dmUnreadTotal = conversations.filter((c) => c.unread).length;

  return {
    myKey,
    directory,
    conversations,
    activeId,
    setActiveId,
    messages,
    otherLastReadAt,
    markRead,
    dmUnreadTotal,
    isLoadingDirectory,
    isLoadingMessages,
    isSending,
    fetchDirectory,
    fetchConversations,
    openConversationWith,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    pinMessage,
    unpinMessage,
  };
}
