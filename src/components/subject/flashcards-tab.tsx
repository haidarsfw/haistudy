"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Shuffle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  PartyPopper,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardItem } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { sounds } from "@/lib/sounds";

interface FlashcardsTabProps {
  items: FlashcardItem[];
  onComplete?: () => void;
  subjectId: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function FlashcardsTab({ items, onComplete, subjectId }: FlashcardsTabProps) {
  const [cards, setCards] = useState(items);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const current = cards[currentIdx];
  const total = cards.length;
  const progress = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  const flip = useCallback(() => { sounds.click(); setFlipped((f) => !f); }, []);

  const next = useCallback(() => {
    sounds.click();
    setFlipped(false);
    setCurrentIdx((i) => Math.min(i + 1, total - 1));
  }, [total]);

  const prev = useCallback(() => {
    sounds.click();
    setFlipped(false);
    setCurrentIdx((i) => Math.max(i - 1, 0));
  }, []);

  const markKnown = useCallback(() => {
    sounds.correct();
    if (current) {
      setCompleted((prev) => new Set(prev).add(current.id));
    }
    if (currentIdx < total - 1) {
      next();
    }
  }, [current, currentIdx, total, next]);

  const doShuffle = useCallback(() => {
    sounds.toggle();
    setCards(shuffleArray(items));
    setCurrentIdx(0);
    setFlipped(false);
  }, [items]);

  const reset = useCallback(() => {
    sounds.click();
    setCards(items);
    setCurrentIdx(0);
    setFlipped(false);
    setCompleted(new Set());
  }, [items]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [flip, next, prev]);

  // Check completion
  useEffect(() => {
    if (completed.size === total && total > 0) {
      onComplete?.();
    }
  }, [completed.size, total, onComplete]);

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Flashcards belum tersedia.
      </p>
    );
  }

  const allDone = completed.size === total && total > 0;

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {subjectId === "cbkwn" && (
        <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 w-full max-w-md">
          <Monitor className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Ujian mata kuliah ini dilaksanakan secara <span className="font-semibold">online</span>. Silakan kunjungi{" "}
            <a href="https://exam.apps.binus.ac.id" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">exam.apps.binus.ac.id</a>{" "}
            untuk informasi lebih lanjut.
          </p>
        </div>
      )}
      {/* Progress */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completed.size}/{total}
        </span>
      </div>

      {/* Completion celebration */}
      {allDone && (
        <div className="flashcard-celebrate-anim flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-6 w-full max-w-md text-center">
          <div className="flex items-center gap-2">
            <PartyPopper className="h-8 w-8 text-primary" />
            <p className="font-heading text-lg font-bold">
              Semua kartu sudah dihafal!
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Ulangi
          </Button>
        </div>
      )}

      {/* Card - CSS 3D flip (replaces framer-motion rotateY animation) */}
      {!allDone && (
        <div
          key={currentIdx}
          className="flashcard-swap-anim perspective-1200 w-full max-w-md cursor-pointer"
          onClick={flip}
        >
          <div
            className={`flashcard-flip preserve-3d relative h-52 w-full ${flipped ? "is-flipped" : ""}`}
          >
            {/* Front */}
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-warm">
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                Istilah
              </p>
              <p className="font-heading text-lg font-semibold">
                {current ? parseInline(current.term) : null}
              </p>
              <p className="mt-4 text-[10px] text-muted-foreground">
                Klik atau tekan Space untuk membalik
              </p>
            </div>

            {/* Back */}
            <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center shadow-warm">
              <p className="text-xs text-primary mb-2 uppercase tracking-wider">
                Definisi
              </p>
              <p className="text-sm leading-relaxed">{current ? parseInline(current.definition) : null}</p>
            </div>
          </div>
        </div>
      )}

      {/* Counter + bookmark */}
      {!allDone && current && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">
            {currentIdx + 1} / {total}
          </p>
          <BookmarkButton
            item={{
              id: `flashcard-${subjectId}-${current.id}`,
              type: "flashcard",
              subjectId,
              title: current.term,
            }}
          />
        </div>
      )}

      {/* Controls */}
      {!allDone && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={prev}
            disabled={currentIdx === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="sm" onClick={doShuffle}>
            <Shuffle className="h-3.5 w-3.5 mr-1" />
            Acak
          </Button>

          <Button variant="outline" size="sm" onClick={markKnown}>
            <Check className="h-3.5 w-3.5 mr-1" />
            Sudah hafal
          </Button>

          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={next}
            disabled={currentIdx === total - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
