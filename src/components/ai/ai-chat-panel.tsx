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
  Pencil,
  Download,
  FileText,
  FileCode,
  FileType,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useAiChat } from "@/hooks/use-ai-chat";
import { AiMessageBubble } from "./ai-message";
import { AiInput } from "./ai-input";
import { AiSuggestions } from "./ai-suggestions";
import { AI_ENABLED, AI_DISABLED_MESSAGE } from "@/lib/feature-flags";
import { useOptionalScope } from "@/components/providers/scope-provider";

interface AiChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId?: string | null;
  // Issue 10: pre-seeded reference (selected materi text) the user wants to ask about.
  reference?: { text: string; subjectId: string | null } | null;
  onReferenceConsumed?: () => void;
}

export function AiChatPanel({ isOpen, onClose, subjectId, reference, onReferenceConsumed }: AiChatPanelProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const scopeCtx = useOptionalScope();
  const examLabel = scopeCtx?.scope.examPeriod === "uas" ? "UAS" : "UTS";
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
    renameConversation,
  } = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [aiModel, setAiModel] = useState<"fast" | "reasoning">("fast");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  // Issue 10: active reference banner — set from the incoming reference prop,
  // attached to the next send, then cleared. Bump focusSignal to refocus input.
  const [activeReference, setActiveReference] = useState<{ text: string; subjectId: string | null } | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);

  // Capture a new incoming reference (from "Tanya AI"), then tell the parent it
  // was consumed so re-opens with the same selection still work.
  useEffect(() => {
    if (reference?.text) {
      setActiveReference(reference);
      setFocusSignal((n) => n + 1);
      onReferenceConsumed?.();
    }
  }, [reference, onReferenceConsumed]);

  // Reset fullscreen whenever panel closes - cleaner UX, fresh each open
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

  // Detect if user is "near the bottom" (< 80px) - only then we auto-follow streams
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
      // Anchor this turn to the active reference (if any), then clear it so it
      // only grounds the immediate question. Reference's own subjectId wins so
      // grounding stays correct even if the user navigated away from the page.
      const ref = activeReference;
      sendMessage(
        text,
        session.licenseKey,
        ref?.subjectId ?? subjectId,
        session.packageTier,
        aiModel,
        session.isAdmin,
        image,
        ref?.text ?? null
      );
      if (ref) setActiveReference(null);
      // User just sent - pin to bottom regardless of prior scroll state
      setIsNearBottom(true);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    },
    [session, sendMessage, subjectId, aiModel, activeReference]
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

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const openRename = useCallback(() => {
    if (!activeConversationId) return;
    setRenameValue(activeConv?.title ?? "");
    setRenameOpen(true);
  }, [activeConversationId, activeConv?.title]);

  const submitRename = useCallback(() => {
    if (!activeConversationId) return;
    const clean = renameValue.trim();
    const current = activeConv?.title ?? "";
    if (!clean || clean === current) {
      setRenameOpen(false);
      return;
    }
    renameConversation(activeConversationId, clean);
    setRenameOpen(false);
    toast.success(t("ai.renamed"));
  }, [activeConversationId, renameValue, activeConv?.title, renameConversation, t]);

  const filenameBase = useCallback((): string => {
    return (
      (activeConv?.title || "percakapan")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "percakapan"
    );
  }, [activeConv?.title]);

  const fmtWhen = (ts?: number): string => {
    try {
      return ts
        ? new Date(ts).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "";
    } catch {
      return "";
    }
  };

  const downloadBlob = (data: Blob | string, ext: string, mime: string) => {
    const blob = typeof data === "string" ? new Blob([data], { type: mime }) : data;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haistudy-ai-${filenameBase()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Export entirely from in-memory messages so local `chat-` ids and persisted
  // UUID conversations take the same path. No server round-trip needed.
  const exportAs = useCallback(
    async (format: "txt" | "md" | "pdf") => {
      if (!activeConv) return;
      setExportOpen(false);
      const title = activeConv.title || "Percakapan haistudy AI";
      try {
        if (format === "md") {
          const lines: string[] = [`# ${title}`, ""];
          for (const m of activeConv.messages) {
            const who = m.role === "user" ? "Kamu" : "haistudy AI";
            const when = fmtWhen(m.timestamp);
            lines.push(`## ${who}${when ? ` (${when})` : ""}`, "", m.content || "", "");
          }
          downloadBlob(lines.join("\n"), "md", "text/markdown;charset=utf-8");
        } else if (format === "txt") {
          const lines: string[] = [title, "=".repeat(title.length), ""];
          for (const m of activeConv.messages) {
            const who = m.role === "user" ? "Kamu" : "haistudy AI";
            const when = fmtWhen(m.timestamp);
            lines.push(`${who}${when ? ` (${when})` : ""}:`, m.content || "", "");
          }
          downloadBlob(lines.join("\n"), "txt", "text/plain;charset=utf-8");
        } else {
          // Lazy-load jsPDF only inside the handler so it never hits the bundle.
          const { jsPDF } = await import("jspdf");
          const doc = new jsPDF({ unit: "pt", format: "a4" });
          const margin = 40;
          const pageW = doc.internal.pageSize.getWidth();
          const pageH = doc.internal.pageSize.getHeight();
          const maxW = pageW - margin * 2;
          let y = margin;
          const writeBlock = (text: string, size: number, bold: boolean) => {
            doc.setFont("helvetica", bold ? "bold" : "normal");
            doc.setFontSize(size);
            const wrapped = doc.splitTextToSize(text, maxW) as string[];
            for (const ln of wrapped) {
              if (y > pageH - margin) {
                doc.addPage();
                y = margin;
              }
              doc.text(ln, margin, y);
              y += size * 1.4;
            }
          };
          writeBlock(title, 16, true);
          y += 6;
          for (const m of activeConv.messages) {
            const who = m.role === "user" ? "Kamu" : "haistudy AI";
            const when = fmtWhen(m.timestamp);
            writeBlock(`${who}${when ? ` (${when})` : ""}`, 11, true);
            writeBlock(m.content || "", 10, false);
            y += 8;
          }
          downloadBlob(doc.output("blob"), "pdf", "application/pdf");
        }
        toast.success(t("ai.exported"));
      } catch {
        toast.error(t("ai.export_error"));
      }
    },
    [activeConv, filenameBase, t]
  );

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
                  Asisten belajar {examLabel}
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
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={openRename}
                      title={t("ai.rename")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExportOpen(true)}
                      title={t("ai.export")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleDeleteCurrent}
                      title="Hapus chat ini"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
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

            {/* Cohort shutdown notice */}
            {!AI_ENABLED && (
              <div className="border-b border-border bg-amber-500/10 px-4 py-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                {AI_DISABLED_MESSAGE}
              </div>
            )}

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
                        Tanya apa saja tentang materi {examLabel}!
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

            {/* Jump-to-bottom pill - appears only when user scrolled up during streaming */}
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
              {/* Issue 10: reference banner — shows the selected materi text the
                  answer will be grounded in. Dismissable; clears on send too. */}
              {activeReference && (
                <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted/50 px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{t("ai.asking_about")}:</span>
                    <p className="mt-0.5 line-clamp-3 text-muted-foreground">
                      «{activeReference.text}»
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveReference(null)}
                    className="shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t("ai.rename_cancel")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <AiInput
                onSend={handleSend}
                isStreaming={isStreaming}
                onStop={stopStreaming}
                aiModel={aiModel}
                onModelChange={setAiModel}
                focusSignal={focusSignal}
              />
            </div>
          </motion.div>

          {/* Rename dialog (in-app, replaces window.prompt) */}
          <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
            <DialogContent className="z-[60] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("ai.rename_title")}</DialogTitle>
              </DialogHeader>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitRename();
                  }
                }}
                placeholder={t("ai.rename_placeholder")}
                maxLength={80}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenameOpen(false)}>
                  {t("ai.rename_cancel")}
                </Button>
                <Button onClick={submitRename}>{t("ai.rename_save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export format picker (in-app) */}
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogContent className="z-[60] sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("ai.export_title")}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => exportAs("txt")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  TXT
                </button>
                <button
                  onClick={() => exportAs("md")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <FileCode className="h-5 w-5 text-muted-foreground" />
                  MD
                </button>
                <button
                  onClick={() => exportAs("pdf")}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-xs font-medium hover:bg-muted transition-colors"
                >
                  <FileType className="h-5 w-5 text-muted-foreground" />
                  PDF
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </AnimatePresence>
  );
}
