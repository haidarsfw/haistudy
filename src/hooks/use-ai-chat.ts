"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAiChatHistory } from "./use-ai-chat-history";
import type { AiConversation } from "./use-ai-chat-history";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  image?: string; // base64 data URL for user-uploaded images
  reasoning?: string; // DeepSeek thinking trace (reasoning_content stream)
  reference?: string; // selected materi snippet this question was grounded in
}

interface UseAiChatReturn {
  messages: AiMessage[];
  isStreaming: boolean;
  error: string | null;
  sendMessage: (
    text: string,
    licenseKey: string,
    subjectId?: string | null,
    packageTier?: "share" | "normal" | "vip" | "diamond",
    model?: "fast" | "reasoning",
    isAdmin?: boolean,
    image?: string | null,
    referenceText?: string | null,
    userName?: string | null
  ) => Promise<void>;
  stopStreaming: () => void;
  clearHistory: () => void;
  conversations: AiConversation[];
  activeConversationId: string | null;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  createNewConversation: () => void;
  renameConversation: (id: string, title: string) => void;
}

// Convert internal messages to Gemini history format
function toGeminiHistory(
  messages: AiMessage[]
): Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> {
  return messages.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
}

export function useAiChat(): UseAiChatReturn {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Refs to avoid stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const {
    conversations,
    activeId,
    setActiveId,
    saveMessages,
    createConversation,
    deleteConversation: deleteConv,
    renameConversation,
    autoRenameConversation,
  } = useAiChatHistory();

  // Keep a ref of conversations to avoid stale reads
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // When sendMessage creates a conversation on the fly, it sets activeId to a
  // brand-new empty conv. The [activeId] load-effect below would then fire and
  // overwrite the just-added user message with that empty conv's messages.
  // This ref lets sendMessage tell the effect to skip exactly one load for the
  // id it just created (first-click / template-seed bug).
  const skipLoadIdRef = useRef<string | null>(null);

  // Load messages when activeId changes
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    if (skipLoadIdRef.current === activeId) {
      skipLoadIdRef.current = null;
      return;
    }
    const conv = conversationsRef.current.find((c) => c.id === activeId);
    setMessages(conv?.messages || []);
  }, [activeId]);

  const sendMessage = useCallback(
    async (
      text: string,
      licenseKey: string,
      subjectId?: string | null,
      packageTier?: "share" | "normal" | "vip" | "diamond",
      model?: "fast" | "reasoning",
      isAdmin?: boolean,
      image?: string | null,
      referenceText?: string | null,
      userName?: string | null
    ) => {
      if (!text.trim() || isStreaming) return;

      // Ensure we have an active conversation
      let convId = activeId;
      if (!convId) {
        convId = await createConversation();
        // createConversation sets activeId to this new empty conv. Suppress the
        // load-effect's one-time reset so it doesn't wipe the message we add next.
        skipLoadIdRef.current = convId;
      }

      setError(null);

      // Add user message
      const userMsg: AiMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
        ...(image ? { image } : {}),
        ...(referenceText ? { reference: referenceText } : {}),
      };

      const updatedMessages = [...messagesRef.current, userMsg];
      setMessages(updatedMessages);

      // Create placeholder for assistant response
      const assistantId = `assistant-${Date.now()}`;
      const withPlaceholder = [
        ...updatedMessages,
        { id: assistantId, role: "assistant" as const, content: "", timestamp: Date.now() },
      ];
      setMessages(withPlaceholder);

      setIsStreaming(true);

      try {
        // Prepare history (exclude the latest user msg)
        const history = toGeminiHistory(
          updatedMessages.slice(0, -1)
        );

        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history,
            subjectId: subjectId || null,
            licenseKey,
            packageTier: packageTier || "normal",
            model: model || "fast",
            isAdmin: isAdmin || false,
            ...(image ? { image } : {}),
            ...(referenceText ? { referenceText } : {}),
            ...(userName ? { userName } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menghubungi AI");
        }

        // Check if mock response (non-streaming)
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === assistantId ? { ...m, content: data.text } : m
            );
            return updated;
          });
          // Save after JSON response
          setTimeout(() => {
            saveMessages(convId!, messagesRef.current);
          }, 0);
          return;
        }

        // Streaming SSE response
        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const payload = trimmed.slice(6);
            if (payload === "[DONE]") break;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.reasoning) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, reasoning: (m.reasoning || "") + parsed.reasoning }
                      : m
                  )
                );
              }
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMessage);

        // Remove empty assistant placeholder on error
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantId && !last.content) {
            return prev.slice(0, -1);
          }
          return prev;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Save final messages using ref to get latest state
        setTimeout(() => {
          const currentMessages = messagesRef.current;
          if (convId && currentMessages.length > 0) {
            saveMessages(convId, currentMessages);

            // Auto-title on the first completed exchange: exactly one user msg
            // and one non-empty assistant reply, and no title set yet. The
            // rename endpoint persists the title server-side; the hook mirrors
            // it locally. Fire-and-forget - never blocks the UI.
            const conv = conversationsRef.current.find((c) => c.id === convId);
            const firstUser = currentMessages.find((m) => m.role === "user");
            const firstAssistant = currentMessages.find(
              (m) => m.role === "assistant" && m.content.trim().length > 0
            );
            const exchangeCount = currentMessages.filter(
              (m) => m.role === "user"
            ).length;
            if (
              !conv?.title?.trim() &&
              exchangeCount === 1 &&
              firstUser &&
              firstAssistant
            ) {
              autoRenameConversation(
                convId,
                firstUser.content,
                firstAssistant.content
              );
            }
          }
        }, 0);
      }
    },
    [isStreaming, activeId, createConversation, saveMessages, autoRenameConversation]
  );

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    // Save current if non-empty, then create new
    if (messagesRef.current.length > 0 && activeId) {
      saveMessages(activeId, messagesRef.current);
    }
    createConversation().then((newId) => {
      setMessages([]);
      setError(null);
      setIsStreaming(false);
      setActiveId(newId);
    });
  }, [activeId, saveMessages, createConversation, setActiveId]);

  const switchConversation = useCallback((id: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    // Explicit switch must always load - never honor a stale send-time skip.
    skipLoadIdRef.current = null;
    // Save current conversation before switching
    if (activeId && messagesRef.current.length > 0) {
      saveMessages(activeId, messagesRef.current);
    }
    setActiveId(id);
    setError(null);
    setIsStreaming(false);
  }, [activeId, saveMessages, setActiveId]);

  const deleteConversation = useCallback((id: string) => {
    deleteConv(id);
    if (id === activeId) {
      const remaining = conversationsRef.current.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
      } else {
        setActiveId(null);
        setMessages([]);
      }
    }
  }, [deleteConv, activeId, setActiveId]);

  const createNewConversation = useCallback(() => {
    if (activeId && messagesRef.current.length > 0) {
      saveMessages(activeId, messagesRef.current);
    }
    createConversation().then((newId) => {
      setMessages([]);
      setError(null);
      setActiveId(newId);
    });
  }, [activeId, saveMessages, createConversation, setActiveId]);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearHistory,
    conversations,
    activeConversationId: activeId,
    switchConversation,
    deleteConversation,
    createNewConversation,
    renameConversation,
  };
}
