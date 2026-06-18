"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ChevronUp, Trophy } from "lucide-react";
import type { KilatProgress, SubjectKilat } from "@/types";
import { useKilat } from "./use-kilat";
import { KilatCardView } from "./kilat-cards";
import { KilatProgressBar } from "./kilat-progress-bar";
import { KilatComplete } from "./kilat-complete";
import { sounds } from "@/lib/sounds";
import { springSmooth } from "@/lib/motion";

interface Props {
  feed: SubjectKilat;
  initial?: KilatProgress;
  onPersist: (s: KilatProgress) => void;
  onClose: () => void;
}

const SWIPE = 56; // px threshold for a deliberate swipe
const LOCK_MS = 520; // debounce between gesture-driven nav

const cardVariants = {
  enter: (d: number) => ({ y: d > 0 ? 64 : -64, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: springSmooth },
  exit: (d: number) => ({ y: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.16 } }),
};

export function KilatPlayer({ feed, initial, onPersist, onClose }: Props) {
  const k = useKilat({ feed, initial, onPersist });
  const [dir, setDir] = useState(1);
  const [showComplete, setShowComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const touchY = useRef<number | null>(null);
  const prevCompleted = useRef(k.completed);

  const next = useCallback(() => { setDir(1); sounds.click(); k.goNext(); }, [k]);
  const prev = useCallback(() => { setDir(-1); sounds.click(); k.goPrev(); }, [k]);

  // Pop the summary the moment the feed is freshly completed.
  useEffect(() => {
    if (k.completed && !prevCompleted.current) setShowComplete(true);
    prevCompleted.current = k.completed;
  }, [k.completed]);

  // Reset inner scroll whenever the card changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [k.index]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showComplete) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, showComplete]);

  // Only navigate by gesture once the inner content is scrolled to its edge,
  // so long cards can scroll naturally before snapping to the next card.
  const atBoundary = (down: boolean) => {
    const el = scrollRef.current;
    if (!el) return true;
    return down
      ? el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      : el.scrollTop <= 2;
  };

  const navLock = (fn: () => void) => {
    if (lockRef.current) return;
    lockRef.current = true;
    fn();
    setTimeout(() => { lockRef.current = false; }, LOCK_MS);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (showComplete) return;
    if (e.deltaY > 24 && atBoundary(true)) navLock(next);
    else if (e.deltaY < -24 && atBoundary(false)) navLock(prev);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (showComplete || touchY.current === null) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (dy > SWIPE && atBoundary(true)) navLock(next);
    else if (dy < -SWIPE && atBoundary(false)) navLock(prev);
    touchY.current = null;
  };

  const current = k.current;
  const isLast = k.index === k.total - 1;
  const gated = !k.canAdvance; // checkpoint not yet cleared

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      <KilatProgressBar
        chapters={feed.chapters}
        cards={k.cards}
        index={k.index}
        reached={k.reached}
        xp={k.xp}
        streak={k.streak}
        onClose={onClose}
      />

      {/* Card area */}
      <div
        className="relative flex-1 overflow-hidden"
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={k.index}
            custom={dir}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0"
          >
            <div
              ref={scrollRef}
              className="h-full overflow-y-auto overscroll-contain px-5 py-6"
            >
              <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center">
                {current && (
                  <KilatCardView
                    card={current}
                    response={k.responses[current.id]}
                    onAnswer={(s, c) => k.answer(current, s, c)}
                    onMatchComplete={() => k.completeMatch(current)}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom control */}
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2">
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          {k.index > 0 && (
            <button
              type="button"
              onClick={prev}
              aria-label="Kartu sebelumnya"
              className="hs-press flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isLast && k.completed) {
                setShowComplete(true);
                return;
              }
              if (gated) return;
              next();
            }}
            disabled={gated && !(isLast && k.completed)}
            className="hs-press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isLast && k.completed ? (
              <>
                <Trophy className="h-4 w-4" /> Lihat hasil
              </>
            ) : gated ? (
              <span className="kilat-pulse">Jawab dulu buat lanjut</span>
            ) : (
              <>
                <ArrowUp className="h-4 w-4" /> Lanjut
              </>
            )}
          </button>
        </div>
      </div>

      {/* Completion overlay */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 overflow-y-auto bg-background"
          >
            <KilatComplete
              xp={k.xp}
              bestStreak={k.bestStreak}
              chaptersDone={k.chaptersDone.length}
              totalChapters={feed.chapters.length}
              onRestart={() => {
                k.reset();
                setShowComplete(false);
              }}
              onClose={onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
