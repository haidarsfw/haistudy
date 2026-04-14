"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Bot,
  Trash2,
  Plus,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useAiChat } from "@/hooks/use-ai-chat";
import { AiMessageBubble } from "./ai-message";
import { AiInput } from "./ai-input";
import { AiSuggestions } from "./ai-suggestions";

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: string | null;
}

export function AiChatPanel({ isOpen, onClose, subjectId }: AiChatPanelProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearHistory,
    conversations,
    activeConversationId,
    switchConversation,
    deleteConversation,
    createNewConversation,
  } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [aiModel, setAiModel] = useState<"fast" | "reasoning">("fast");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  // Reset fullscreen whenever panel closes — cleaner UX, fresh each open
  useEffect(() => {
    if (!isOpen) setIsFullscreen(false);
  }, [isOpen]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Detect if user is "near the bottom" (< 80px) — only then we auto-follow streams
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => {
      const threshold = 80;
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setIsNearBottom(atBottom);
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [isOpen]);

  // Auto-scroll to bottom ONLY if the user is already near the bottom
  useEffect(() => {
    if (!scrollRef.current) return;
    if (isNearBottom) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isNearBottom]);

  // Snap to bottom when panel opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          setIsNearBottom(true);
        }
      });
    }
  }, [isOpen]);

  const handleSend = useCallback(
    (text: string, image?: string | null) => {
      if (!session) return;
      sendMessage(
        text,
        session.licenseKey,
        subjectId,
        session.packageTier,
        aiModel,
        session.isAdmin,
        image
      );
      // User just sent — pin to bottom regardless of prior scroll state
      setIsNearBottom(true);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    },
    [session, sendMessage, subjectId, aiModel]
  );

  const retryLastMessage = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && session) {
      handleSend(lastUserMsg.content, lastUserMsg.image);
    }
  }, [messages, session, handleSend]);

  const handleDeleteCurrent = useCallback(() => {
    if (activeConversationId) {
      deleteConversation(activeConversationId);
    }
  }, [activeConversationId, deleteConversation]);

  const jumpToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsNearBottom(true);
    }
  }, []);

  if (!session) return null;

  const panelClass = isFullscreen
    ? "fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-t border-border bg-background shadow-xl"
    : "fixed right-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border-t border-border bg-background shadow-xl h-[80dvh] max-h-[calc(100dvh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-0 sm:right-0 sm:h-auto sm:w-[380px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={onClose}
          />

          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hidden bg-black/20 sm:block"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className={panelClass}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Bot className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold">haistudy AI</h2>
                <p className="text-[10px] text-muted-foreground">
                  {t("ai.assistant_subtitle")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={createNewConversation}
                  title="Chat baru"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDeleteCurrent}
                    title="Hapus chat ini"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen((v) => !v)}
                  title={isFullscreen ? "Keluar fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Conversation pills */}
            {conversations.filter(
              (c) => c.messages.length > 0 || c.id === activeConversationId
            ).length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2 border-b border-border">
                {conversations
                  .filter(
                    (c) =>
                      c.messages.length > 0 || c.id === activeConversationId
                  )
                  .map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => switchConversation(conv.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        conv.id === activeConversationId
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {conv.title || t("ai.new_chat")}
                    </button>
                  ))}
                {/* New chat button moved to header */}
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto"
            >
              <div
                className={
                  isFullscreen
                    ? "mx-auto max-w-3xl space-y-3 p-4"
                    : "space-y-3 p-4"
                }
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center gap-4 pt-8">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                      <Bot className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-semibold">Halo! 👋</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Aku haistudy AI, siap bantu kamu belajar.
                        <br />
                        Tanya apa saja tentang materi UTS!
                      </p>
                    </div>
                    <AiSuggestions
                      subjectId={subjectId}
                      onSelect={handleSend}
                    />
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <AiMessageBubble
                        key={msg.id}
                        message={msg}
                        isStreaming={
                          isStreaming &&
                          msg.role === "assistant" &&
                          i === messages.length - 1
                        }
                      />
                    ))}
                  </>
                )}

                {/* Error display with retry */}
                {error && (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <span>{error}</span>
                    <button
                      onClick={retryLastMessage}
                      className="flex items-center gap-1 shrink-0 rounded-md px-2 py-1 hover:bg-destructive/10 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Coba lagi
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Jump-to-bottom pill — appears only when user scrolled up during streaming */}
            {!isNearBottom && isStreaming && (
              <button
                onClick={jumpToBottom}
                className="absolute bottom-24 right-4 z-10 flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs shadow-lg hover:opacity-90 transition-opacity"
              >
                <ChevronDown className="h-3 w-3" />
                Lompat ke bawah
              </button>
            )}

            {/* Input */}
            <div className={isFullscreen ? "mx-auto w-full max-w-3xl" : ""}>
              <AiInput
                onSend={handleSend}
                isStreaming={isStreaming}
                onStop={stopStreaming}
                aiModel={aiModel}
                onModelChange={setAiModel}
                showModelToggle={
                  session.packageTier === "vip" ||
                  session.packageTier === "diamond" ||
                  session.isAdmin
                }
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
