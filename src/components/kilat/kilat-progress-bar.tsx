"use client";

import { motion } from "framer-motion";
import { Zap, Flame, X } from "lucide-react";
import type { KilatCard, KilatChapter } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  chapters: KilatChapter[];
  cards: KilatCard[];
  index: number;
  reached: number;
  xp: number;
  streak: number;
  onClose: () => void;
}

export function KilatProgressBar({
  chapters,
  cards,
  index,
  reached,
  xp,
  streak,
  onClose,
}: Props) {
  const activeChapter = cards[index]?.chapter ?? 1;

  return (
    <div className="flex items-center gap-3 px-3 pt-[calc(env(safe-area-inset-top)+10px)] pb-2.5 sm:px-4">
      {/* Segmented progress, one segment per chapter (Stories-style) */}
      <div className="flex flex-1 items-center gap-1.5">
        {chapters.map((ch) => {
          const idxs = cards
            .map((c, i) => (c.chapter === ch.n ? i : -1))
            .filter((i) => i >= 0);
          const reachedInCh = idxs.filter((i) => i <= reached).length;
          const fill = idxs.length ? (reachedInCh / idxs.length) * 100 : 0;
          return (
            <div
              key={ch.n}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              title={`Bab ${ch.n}: ${ch.title}`}
            >
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-[width] duration-500",
                  ch.n === activeChapter && fill < 100 && "kilat-pulse"
                )}
                style={{ width: `${fill}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* XP */}
      <motion.div
        key={xp}
        className="kilat-xp-pop flex items-center gap-1 text-xs font-bold tabular-nums text-primary"
      >
        <Zap className="h-3.5 w-3.5 fill-primary" />
        {xp}
      </motion.div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-1 text-xs font-bold tabular-nums text-amber-500">
          <Flame className="h-3.5 w-3.5 fill-amber-500" />
          {streak}
        </div>
      )}

      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="hs-press flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
