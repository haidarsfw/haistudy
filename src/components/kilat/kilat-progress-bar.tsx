"use client";

import { motion } from "framer-motion";
import { Star, X, ListTree } from "lucide-react";
import type { KilatCard, KilatChapter } from "@/types";
import { cn } from "@/lib/utils";

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
}: Props) {
  const activeChapter = cards[index]?.chapter ?? 1;

  return (
    <div className="flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 sm:px-4">
      <button
        type="button"
        onClick={onOpenOutline}
        aria-label="Daftar isi"
        className="hs-press flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ListTree className="h-4 w-4" />
      </button>

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
