"use client";

import { motion } from "framer-motion";
import { Star, X, ListTree, RotateCcw } from "lucide-react";
import type { KilatCard, KilatChapter } from "@/types";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Props {
  chapters: KilatChapter[];
  cards: KilatCard[];
  index: number;
  reached: number;
  points: number;
  gradedTotal: number;
  onClose: () => void;
  onOpenOutline: () => void;
  onJumpChapter: (n: number) => void;
  onRestart: () => void;
}

export function KilatProgressBar({
  chapters,
  cards,
  index,
  reached,
  points,
  onClose,
  onOpenOutline,
  onJumpChapter,
  onRestart,
}: Props) {
  const activeChapter = cards[index]?.chapter ?? 1;

  return (
    <div className="flex items-center gap-1.5 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 sm:gap-2 sm:px-4">
      {/* Daftar isi - tinted pill so it's easy to spot */}
      <button
        type="button"
        onClick={onOpenOutline}
        aria-label="Daftar isi"
        className="hs-press flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 text-primary"
      >
        <ListTree className="h-3.5 w-3.5" />
        <span className="hidden text-[11px] font-semibold sm:inline">Daftar isi</span>
      </button>

      {/* Restart, right beside it, behind a confirmation */}
      <ConfirmDialog
        title="Ulang dari awal?"
        description="Semua jawaban dan poin di sesi ini bakal direset, dan kamu mulai lagi dari kartu pertama."
        onConfirm={onRestart}
        trigger={
          <button
            type="button"
            aria-label="Ulang dari awal"
            className="hs-press flex h-7 shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden text-[11px] font-semibold sm:inline">Ulang</span>
          </button>
        }
      />

      {/* Segmented progress, one segment per chapter (tap a reached chapter to jump) */}
      <div className="flex flex-1 items-center gap-1.5">
        {chapters.map((ch) => {
          const idxs = cards
            .map((c, i) => (c.chapter === ch.n ? i : -1))
            .filter((i) => i >= 0);
          const reachedInCh = idxs.filter((i) => i <= reached).length;
          const fill = idxs.length ? (reachedInCh / idxs.length) * 100 : 0;
          const chReached = idxs.some((i) => i <= reached);
          return (
            <button
              key={ch.n}
              type="button"
              disabled={!chReached}
              onClick={() => onJumpChapter(ch.n)}
              title={`Bab ${ch.n}: ${ch.title}`}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted disabled:cursor-default"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-[width] duration-500",
                  ch.n === activeChapter && fill < 100 && "kilat-pulse"
                )}
                style={{ width: `${fill}%` }}
              />
            </button>
          );
        })}
      </div>

      {/* Points */}
      <motion.div
        key={points}
        className="kilat-xp-pop flex items-center gap-1 text-xs font-bold tabular-nums text-primary"
      >
        <Star className="h-3.5 w-3.5 fill-primary" />
        {points}
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="hs-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
