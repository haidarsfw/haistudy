"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, useDragControls } from "framer-motion";
import { Bot, X, Minus, Sparkles, GripHorizontal, SquarePen, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/components/providers/session-provider";
import { useAiChat } from "@/hooks/use-ai-chat";
import { AiMessageBubble } from "@/components/ai/ai-message";
import { AiInput } from "@/components/ai/ai-input";
import { springSmooth } from "@/lib/motion";
import { cn } from "@/lib/utils";
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

// Desktop window geometry. Persisted by the player so minimize keeps it and
// close (X) resets it.
export interface KilatAiGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_W = 300;
const MIN_H = 320;

interface Props {
  open: boolean;
  card: KilatCard;
  subjectId: string;
  geom: KilatAiGeom | null;
  onGeom: (g: KilatAiGeom) => void;
  onMinimize: () => void;
  onClose: () => void;
}

export function KilatAiDock({ open, card, subjectId, geom, onGeom, onMinimize, onClose }: Props) {
  const { session } = useSession();
  const isMobile = useIsMobile();
  const { messages, isStreaming, error, sendMessage, stopStreaming, clearHistory } = useAiChat();

  const [aiModel, setAiModel] = useState<"fast" | "reasoning">("fast");
  const [focusSignal, setFocusSignal] = useState(0);
  // Quick-question templates: open on an empty thread, collapse after the first
  // question, re-open when the thread is cleared (new chat).
  const [templatesOpen, setTemplatesOpen] = useState(true);
  const prevLenRef = useRef(0);

  const cardRef = useRef(card);
  cardRef.current = card;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Refs so the window-resize listeners always read the freshest values.
  const geomRef = useRef(geom);
  geomRef.current = geom;
  const onGeomRef = useRef(onGeom);
  onGeomRef.current = onGeom;
  const dragRef = useRef<{
    mode: string;
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
  } | null>(null);

  const ctx = cardToText(card);

  // Focus the input when the dock opens.
  useEffect(() => {
    if (open) setFocusSignal((n) => n + 1);
  }, [open]);

  // Collapse templates after the first question; reopen on a cleared thread.
  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = messages.length;
    if (messages.length === 0) setTemplatesOpen(true);
    else if (prev === 0) setTemplatesOpen(false);
  }, [messages.length]);

  // Compute a default geometry the first time it opens on desktop.
  useEffect(() => {
    if (!open || isMobile || geom) return;
    const w = 380;
    const h = Math.min(Math.round(window.innerHeight * 0.82), 660);
    onGeom({
      x: Math.max(16, window.innerWidth - w - 24),
      y: Math.max(16, window.innerHeight - h - 24),
      w,
      h,
    });
  }, [open, isMobile, geom, onGeom]);

  // Keep the view pinned to the newest message.
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

  const onResizeMove = useCallback((e: PointerEvent) => {
    const s = dragRef.current;
    const g = geomRef.current;
    if (!s || !g) return;
    const dx = e.clientX - s.sx;
    const dy = e.clientY - s.sy;
    let x = s.ox;
    let y = s.oy;
    let w = s.ow;
    let h = s.oh;
    const m = s.mode;
    if (m === "move") {
      x = s.ox + dx;
      y = s.oy + dy;
    } else {
      if (m.includes("e")) w = s.ow + dx;
      if (m.includes("s")) h = s.oh + dy;
      if (m.includes("w")) {
        w = s.ow - dx;
        x = s.ox + dx;
      }
      if (m.includes("n")) {
        h = s.oh - dy;
        y = s.oy + dy;
      }
    }
    if (w < MIN_W) {
      if (m.includes("w")) x -= MIN_W - w;
      w = MIN_W;
    }
    if (h < MIN_H) {
      if (m.includes("n")) y -= MIN_H - h;
      h = MIN_H;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    w = Math.min(w, vw - 16);
    h = Math.min(h, vh - 16);
    x = Math.max(8, Math.min(x, vw - w - 8));
    y = Math.max(8, Math.min(y, vh - h - 8));
    onGeomRef.current({ x, y, w, h });
  }, []);

  const onResizeUp = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", onResizeUp);
    document.body.style.userSelect = "";
  }, [onResizeMove]);

  const startDrag = useCallback(
    (mode: string) => (e: ReactPointerEvent) => {
      if (isMobile) return;
      const g = geomRef.current;
      if (!g) return;
      e.preventDefault();
      dragRef.current = { mode, sx: e.clientX, sy: e.clientY, ox: g.x, oy: g.y, ow: g.w, oh: g.h };
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onResizeMove);
      window.addEventListener("pointerup", onResizeUp);
    },
    [isMobile, onResizeMove, onResizeUp]
  );

  const headerDown = useCallback(
    (e: ReactPointerEvent) => {
      if ((e.target as HTMLElement).closest("button,a,input,textarea,[role='button']")) return;
      startDrag("move")(e);
    },
    [startDrag]
  );

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onResizeMove);
      window.removeEventListener("pointerup", onResizeUp);
    };
  }, [onResizeMove, onResizeUp]);

  if (!session || !open) return null;

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

      {/* Template quick-questions - collapsible; auto-collapses after first Q */}
      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setTemplatesOpen((o) => !o)}
          aria-expanded={templatesOpen}
          className="hs-press flex w-full items-center justify-between px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
        >
          <span>Pertanyaan cepat</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              templatesOpen && "rotate-180"
            )}
          />
        </button>
        {templatesOpen && (
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-2">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl}
                type="button"
                disabled={isStreaming}
                onClick={() => sendGrounded(tpl)}
                className="hs-press w-full truncate rounded-full border border-border bg-card px-2.5 py-1 text-center text-[11px] font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50"
              >
                {tpl}
              </button>
            ))}
          </div>
        )}
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

  // ─── Mobile: bottom sheet ───
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
          if (info.offset.y > 90 || info.velocity.y > 500) onMinimize();
        }}
        className="fixed inset-x-0 bottom-0 z-[96] flex h-[72dvh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-xl"
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex shrink-0 cursor-grab touch-none items-center justify-center pt-2 pb-1 active:cursor-grabbing"
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        </div>
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 pb-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">haistudy AI</span>
          <button
            type="button"
            onClick={() => clearHistory()}
            aria-label="Obrolan baru"
            title="Obrolan baru"
            className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
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

  // ─── Desktop: movable + resizable window ───
  if (!geom) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ left: geom.x, top: geom.y, width: geom.w, height: geom.h }}
      className="fixed z-[96] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
    >
      {/* Header - drag to move */}
      <div
        onPointerDown={headerDown}
        className="flex shrink-0 cursor-grab touch-none items-center gap-2 border-b border-border px-3 py-2.5 active:cursor-grabbing"
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground/60" />
        <Bot className="h-4 w-4 text-primary" />
        <span className="flex-1 text-sm font-semibold">haistudy AI</span>
        <button
          type="button"
          onClick={() => clearHistory()}
          aria-label="Obrolan baru"
          title="Obrolan baru"
          className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <SquarePen className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Kecilkan"
          className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {body}

      {/* Resize handles (OS-style: edges + corners) */}
      <div onPointerDown={startDrag("n")} className="absolute -top-1 left-3 right-3 z-10 h-2 cursor-ns-resize" />
      <div onPointerDown={startDrag("s")} className="absolute -bottom-1 left-3 right-3 z-10 h-2 cursor-ns-resize" />
      <div onPointerDown={startDrag("e")} className="absolute -right-1 top-3 bottom-3 z-10 w-2 cursor-ew-resize" />
      <div onPointerDown={startDrag("w")} className="absolute -left-1 top-3 bottom-3 z-10 w-2 cursor-ew-resize" />
      <div onPointerDown={startDrag("nw")} className="absolute -left-1 -top-1 z-20 h-3.5 w-3.5 cursor-nwse-resize" />
      <div onPointerDown={startDrag("ne")} className="absolute -right-1 -top-1 z-20 h-3.5 w-3.5 cursor-nesw-resize" />
      <div onPointerDown={startDrag("sw")} className="absolute -bottom-1 -left-1 z-20 h-3.5 w-3.5 cursor-nesw-resize" />
      <div onPointerDown={startDrag("se")} className="absolute -bottom-1 -right-1 z-20 h-3.5 w-3.5 cursor-nwse-resize" />
    </motion.div>
  );
}
