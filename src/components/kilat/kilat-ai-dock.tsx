"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Bot, X, Minus, Sparkles, GripHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/components/providers/session-provider";
import { useAiChat } from "@/hooks/use-ai-chat";
import { AiMessageBubble } from "@/components/ai/ai-message";
import { AiInput } from "@/components/ai/ai-input";
import { AI_ENABLED } from "@/lib/feature-flags";
import { springSmooth } from "@/lib/motion";
import { sounds } from "@/lib/sounds";
import { cardToText } from "./card-to-text";
import type { KilatCard } from "@/types";

const TEMPLATES = [
  "Jelaskan lebih detail",
  "Jelaskan lebih mudah",
  "Kasih contoh",
  "Kenapa ini penting?",
  "Ringkas poin pentingnya",
  "Kasih analogi sederhana",
];

interface Props {
  subjectId: string;
  card: KilatCard;
}

export function KilatAiDock({ subjectId, card }: Props) {
  const { session } = useSession();
  const isMobile = useIsMobile();
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
  } = useAiChat();

  const [open, setOpen] = useState(false);
  const [aiModel, setAiModel] = useState<"fast" | "reasoning">("fast");
  const [focusSignal, setFocusSignal] = useState(0);

  // Always read the freshest card when sending, even though `card` is a prop
  // that changes as the user navigates the feed.
  const cardRef = useRef(card);
  cardRef.current = card;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const constraintsRef = useRef<HTMLDivElement>(null);

  const ctx = cardToText(card);

  // Keep the view pinned to the newest message while the dock is open.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  const sendGrounded = useCallback(
    (text: string, image?: string | null) => {
      if (!session || !text.trim()) return;
      const grounded = cardToText(cardRef.current);
      sendMessage(
        text,
        session.licenseKey,
        subjectId,
        session.packageTier,
        aiModel,
        session.isAdmin,
        image ?? null,
        grounded.text || null,
        session.shortName
      );
    },
    [session, sendMessage, subjectId, aiModel]
  );

  const openDock = useCallback(() => {
    sounds.toggle();
    setOpen(true);
    setFocusSignal((n) => n + 1);
  }, []);

  const startDrag = useCallback(
    (e: ReactPointerEvent) => {
      if (isMobile) return;
      if ((e.target as HTMLElement).closest("button,a,input,textarea,[role='button']")) return;
      dragControls.start(e);
    },
    [isMobile, dragControls]
  );

  if (!session || !AI_ENABLED) return null;

  // ─── Minimized trigger ───
  if (!open) {
    if (isMobile) {
      // Bottom-right + semi-transparent so it doesn't sit on top of the centered
      // "Belum dijawab..." hint above the bottom control.
      return (
        <button
          type="button"
          onClick={openDock}
          aria-label="Tanya haistudy AI soal kartu ini"
          className="hs-press fixed bottom-[calc(env(safe-area-inset-bottom)+110px)] right-3 z-[96] flex items-center gap-1.5 rounded-full border border-primary/25 bg-card/60 px-3 py-1.5 text-[11px] font-semibold text-primary shadow-md backdrop-blur-sm"
        >
          <Bot className="h-3.5 w-3.5" />
          Tanya AI
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={openDock}
        aria-label="Tanya haistudy AI soal kartu ini"
        className="hs-press fixed bottom-28 right-5 z-[96] flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-card text-primary shadow-lg hover:bg-primary hover:text-primary-foreground"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  // ─── Shared inner content ───
  const hasMsgs = messages.length > 0;
  const body = (
    <>
      {/* Grounding banner - persistent context once the chat has started */}
      {hasMsgs && (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-2 text-[11px]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Lagi bahas: <span className="font-medium text-foreground">{ctx.label}</span>
          </span>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {!hasMsgs ? (
          <div className="flex flex-col items-center gap-3 px-2 pt-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" /> Lagi bahas
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
                {ctx.label}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Tanya apa aja soal materi ini, atau pilih salah satu di bawah.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <AiMessageBubble
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.role === "assistant" && i === messages.length - 1}
            />
          ))
        )}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Template quick-questions - 2-column grid so they fill the width */}
      <div className="grid grid-cols-2 gap-1.5 border-t border-border px-3 py-2">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl}
            type="button"
            disabled={isStreaming}
            onClick={() => sendGrounded(tpl)}
            className="hs-press w-full truncate rounded-full border border-border bg-card px-2.5 py-1.5 text-center text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {tpl}
          </button>
        ))}
      </div>

      <AiInput
        onSend={sendGrounded}
        isStreaming={isStreaming}
        onStop={stopStreaming}
        aiModel={aiModel}
        onModelChange={setAiModel}
        focusSignal={focusSignal}
      />
    </>
  );

  // ─── Mobile: bottom sheet rising from the pill ───
  if (isMobile) {
    return (
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={springSmooth}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (info.offset.y > 90 || info.velocity.y > 500) setOpen(false);
        }}
        className="fixed inset-x-0 bottom-0 z-[96] flex h-[68dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-xl"
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex shrink-0 cursor-grab touch-none items-center gap-2 px-3 pt-2 pb-2 active:cursor-grabbing"
        >
          <span className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        </div>
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">haistudy AI</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {body}
      </motion.div>
    );
  }

  // ─── Desktop: floating, draggable window ───
  return (
    <div ref={constraintsRef} className="pointer-events-none fixed inset-0 z-[96]">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.04}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={constraintsRef}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto absolute bottom-6 right-6 flex h-[min(70vh,520px)] w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div
          onPointerDown={startDrag}
          className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border px-3 py-2.5 active:cursor-grabbing"
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground/60" />
          <Bot className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">haistudy AI</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Kecilkan"
            className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup"
            className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {body}
      </motion.div>
    </div>
  );
}
