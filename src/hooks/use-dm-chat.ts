"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { dmMessagesChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { RATE_LIMITS } from "@/lib/constants";
import type { DmConversation, DmDirectoryUser, DmMessage } from "@/types";

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
    } catch (error) {
      console.error("Failed to fetch DM messages:", error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    fetchConversations();
  }, [session, fetchConversations]);

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
    else setMessages([]);
  }, [activeId, fetchMessages]);

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

  // ── Send a message in the active conversation ──
  const sendMessage = useCallback(
    async (body: string) => {
      if (!session || !activeId || !body.trim()) return;
      const now = Date.now();
      if (now - lastSendTime.current < RATE_LIMITS.CHAT_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum mengirim pesan");
      }
      setIsSending(true);
      try {
        const res = await fetch(
          `/api/dm/conversations/${encodeURIComponent(activeId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: body.trim() }),
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
      } finally {
        setIsSending(false);
      }
    },
    [session, activeId, fetchConversations]
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
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          const row = payload.new;
          // Realtime filter narrows by semester only; cross-check the rest.
          if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan) {
            return;
          }
          // Only append to the open conversation; bump the list otherwise.
          if (row.conversation_id === activeIdRef.current) {
            const msg: DmMessage = {
              id: row.id,
              conversationId: row.conversation_id,
              senderKey: row.sender_key,
              body: row.body,
              createdAt: row.created_at,
            };
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          }
          // Keep the conversation list fresh (ordering + previews + unread).
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope, session, fetchConversations]);

  return {
    myKey,
    directory,
    conversations,
    activeId,
    setActiveId,
    messages,
    isLoadingDirectory,
    isLoadingMessages,
    isSending,
    fetchDirectory,
    fetchConversations,
    openConversationWith,
    sendMessage,
  };
}
