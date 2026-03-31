"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import type { AiMessage } from "./use-ai-chat";

const STORAGE_KEY = "hs-ai-chats";
const MAX_CONVERSATIONS = 5;
const SAVE_DEBOUNCE_MS = 1500;

export interface AiConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: number;
  updatedAt: number;
}

// Server conversation shape from Supabase
interface ServerConversation {
  id: string;
  title: string;
  messages: AiMessage[];
  created_at: string;
  updated_at: string;
}

function toLocal(sc: ServerConversation): AiConversation {
  return {
    id: sc.id,
    title: sc.title,
    messages: sc.messages || [],
    createdAt: new Date(sc.created_at).getTime(),
    updatedAt: new Date(sc.updated_at).getTime(),
  };
}

function loadLocalConversations(): AiConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AiConversation[]) : [];
  } catch {
    return [];
  }
}

function persistLocal(conversations: AiConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function useAiChatHistory() {
  const { session } = useSession();
  const [conversations, setConversations] = useState<AiConversation[]>(
    () => loadLocalConversations()
  );
  const [activeId, setActiveId] = useState<string | null>(() => {
    const loaded = loadLocalConversations();
    return loaded.length > 0 ? loaded[0].id : null;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingSaveRef = useRef<Map<string, { messages: AiMessage[]; title: string }>>(new Map());

  // Fetch conversations from server on mount
  useEffect(() => {
    if (!session) return;

    const fetchFromServer = async () => {
      try {
        const res = await fetch(
          `/api/ai/conversations?licenseKey=${encodeURIComponent(session.licenseKey)}`
        );
        const data = await res.json();

        if (data.conversations && data.conversations.length > 0) {
          const serverConvs = (data.conversations as ServerConversation[]).map(toLocal);

          setConversations((localConvs) => {
            // Merge: server wins for existing IDs, keep local-only ones
            const serverIds = new Set(serverConvs.map((c) => c.id));
            const localOnly = localConvs.filter((c) => !serverIds.has(c.id));

            // Combine and sort by updatedAt
            const merged = [...serverConvs, ...localOnly]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, MAX_CONVERSATIONS);

            persistLocal(merged);
            return merged;
          });

          setActiveId((current) => {
            if (current) return current;
            return serverConvs[0]?.id || null;
          });
        }
      } catch (error) {
        console.error("Failed to fetch AI conversations:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchFromServer();
  }, [session]);

  // Debounced save to server
  const flushSave = useCallback(
    async (id: string, messages: AiMessage[], title: string) => {
      if (!session) return;
      try {
        await fetch("/api/ai/conversations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, messages, title }),
        });
      } catch (error) {
        console.error("Failed to save AI conversation:", error);
      }
    },
    [session]
  );

  const saveMessages = useCallback(
    (id: string, messages: AiMessage[]) => {
      const title =
        messages.find((m) => m.role === "user")?.content.slice(0, 40) || "";

      // Update local state + localStorage immediately
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? { ...c, messages, title, updatedAt: Date.now() } : c
        );
        const exists = updated.some((c) => c.id === id);
        const result = exists
          ? updated
          : [
              ...updated,
              {
                id,
                title,
                messages,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ];
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        const trimmed = result.slice(0, MAX_CONVERSATIONS);
        persistLocal(trimmed);
        return trimmed;
      });

      // Debounced server save
      pendingSaveRef.current.set(id, { messages, title });
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        for (const [saveId, { messages: m, title: t }] of pendingSaveRef.current) {
          flushSave(saveId, m, t);
        }
        pendingSaveRef.current.clear();
      }, SAVE_DEBOUNCE_MS);
    },
    [flushSave]
  );

  const createConversation = useCallback(async (): Promise<string> => {
    if (!session) {
      // Fallback to local-only
      const id = `chat-${Date.now()}`;
      setConversations((prev) => {
        const newConv: AiConversation = {
          id,
          title: "",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const updated = [newConv, ...prev].slice(0, MAX_CONVERSATIONS);
        persistLocal(updated);
        return updated;
      });
      setActiveId(id);
      return id;
    }

    try {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: session.licenseKey }),
      });
      const data = await res.json();

      if (data.conversation) {
        const conv = toLocal(data.conversation);
        setConversations((prev) => {
          const updated = [conv, ...prev].slice(0, MAX_CONVERSATIONS);
          persistLocal(updated);
          return updated;
        });
        setActiveId(conv.id);
        return conv.id;
      }
    } catch (error) {
      console.error("Failed to create AI conversation:", error);
    }

    // Fallback
    const id = `chat-${Date.now()}`;
    setConversations((prev) => {
      const newConv: AiConversation = {
        id,
        title: "",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [newConv, ...prev].slice(0, MAX_CONVERSATIONS);
      persistLocal(updated);
      return updated;
    });
    setActiveId(id);
    return id;
  }, [session]);

  const deleteConversation = useCallback(
    async (id: string) => {
      // Remove from local state immediately
      let nextId: string | null = null;
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        persistLocal(updated);
        nextId = updated.length > 0 ? updated[0].id : null;
        return updated;
      });
      setActiveId((currentId) => {
        if (currentId === id) return nextId;
        return currentId;
      });

      // Delete from server
      if (session) {
        try {
          await fetch("/api/ai/conversations", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, licenseKey: session.licenseKey }),
          });
        } catch (error) {
          console.error("Failed to delete AI conversation:", error);
        }
      }
    },
    [session]
  );

  return {
    conversations,
    activeId,
    setActiveId,
    saveMessages,
    createConversation,
    deleteConversation,
    isLoaded,
  };
}
