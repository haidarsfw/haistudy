"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp, ChevronUp, Trophy, SkipForward } from "lucide-react";
import type { KilatProgress, SubjectKilat } from "@/types";
import { useKilat } from "./use-kilat";
import { isGated } from "./kilat-types";
import { KilatCardView } from "./cards";
import { KilatProgressBar } from "./kilat-progress-bar";
import { KilatComplete } from "./kilat-complete";
import { KilatOutline } from "./kilat-outline";
import { KilatTutorial } from "./kilat-tutorial";
import { KilatAiDock, type KilatAiGeom } from "./kilat-ai-dock";
import { sounds } from "@/lib/sounds";
import { springSmooth } from "@/lib/motion";

interface Props {
  feed: SubjectKilat;
  subjectId: string;
  initial?: KilatProgress;
  onPersist: (s: KilatProgress) => void;
  onClose: () => void;
}

const TUT_KEY = "hs-kilat-tutorial-seen";
const SWIPE = 56;
const LOCK_MS = 450;

const cardVariants = {
  enter: (d: number) => ({ y: d > 0 ? 64 : -64, opacity: 0 }),
  center: { y: 0, opacity: 1, transition: springSmooth },
  exit: (d: number) => ({ y: d > 0 ? -48 : 48, opacity: 0, transition: { duration: 0.16 } }),
};

export function KilatPlayer({ feed, subjectId, initial, onPersist, onClose }: Props) {
  const k = useKilat({ feed, initial, onPersist });
  const reduce = useReducedMotion();
  const [dir, setDir] = useState(1);
  const [showComplete, setShowComplete] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  // HiStudy AI dock: open/minimized + desktop window geometry. Minimize keeps
  // the geometry; close (X) resets it to null so it re-centers next time.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGeom, setAiGeom] = useState<KilatAiGeom | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef(false);
  const touchY = useRef<number | null>(null);
  const prevCompleted = useRef(k.completed);
  // One physical scroll gesture (incl. trackpad momentum) = at most one action.
  const wheelActedRef = useRef(false);
  const wheelEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOpen = showComplete || showOutline || showTutorial;

  // One-time swipe tutorial (lifetime, across courses).
  useEffect(() => {
    try {
      setShowTutorial(localStorage.getItem(TUT_KEY) !== "1");
    } catch {
      /* ignore */
    }
  }, []);
  const dismissTutorial = useCallback(() => {
    try {
      localStorage.setItem(TUT_KEY, "1");
    } catch {
      /* ignore */
    }
    setShowTutorial(false);
  }, []);

  const doAdvance = useCallback(() => {
    setDir(1);
    sounds.click();
    k.goNext();
  }, [k]);
  const prev = useCallback(() => {
    setDir(-1);
    sounds.click();
    k.goPrev();
  }, [k]);

  // Advance with force-skip support: a gated card's first advance just arms the
  // skip (no debounce so a quick 2nd press/swipe skips); real moves are debounced.
  const tryAdvance = useCallback(() => {
    const card = k.current;
    const gatedNow = !!card && isGated(card) && !k.responses[card.id];
    if (gatedNow && !k.pendingSkip) {
      doAdvance();
      return;
    }
    if (lockRef.current) return;
    lockRef.current = true;
    doAdvance();
    setTimeout(() => { lockRef.current = false; }, LOCK_MS);
  }, [k, doAdvance]);

  const tryPrev = useCallback(() => {
    if (lockRef.current) return;
    lockRef.current = true;
    prev();
    setTimeout(() => { lockRef.current = false; }, LOCK_MS);
  }, [prev]);

  const jump = useCallback(
    (i: number) => {
      setDir(i >= k.index ? 1 : -1);
      k.jumpTo(i);
      setShowOutline(false);
    },
    [k]
  );

  // Restart from scratch. Shared by the top-bar button and the outline sheet;
  // both wrap their trigger in a confirmation dialog before calling this.
  const doRestart = useCallback(() => {
    k.reset();
    setShowOutline(false);
    setShowComplete(false);
  }, [k]);

  useEffect(() => {
    if (k.completed && !prevCompleted.current) setShowComplete(true);
    prevCompleted.current = k.completed;
  }, [k.completed]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [k.index]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlayOpen) {
        if (e.key === "Escape") {
          if (showOutline) setShowOutline(false);
          else if (showTutorial) dismissTutorial();
          else onClose();
        }
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowDown" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        tryAdvance();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        tryPrev();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryAdvance, tryPrev, onClose, overlayOpen, showOutline, showTutorial, dismissTutorial]);

  const atBoundary = (down: boolean) => {
    const el = scrollRef.current;
    if (!el) return true;
    return down
      ? el.scrollTop + el.clientHeight >= el.scrollHeight - 2
      : el.scrollTop <= 2;
  };

  const onWheel = (e: React.WheelEvent) => {
    if (overlayOpen) return;
    // Keep the gesture "open" while wheel events keep arriving (momentum), and
    // only act on the FIRST event of each gesture. A second, deliberate scroll
    // (after the wheel goes quiet ~170ms) is needed to move again or force-skip.
    if (wheelEndRef.current) clearTimeout(wheelEndRef.current);
    wheelEndRef.current = setTimeout(() => { wheelActedRef.current = false; }, 170);
    if (wheelActedRef.current) return;
    if (Math.abs(e.deltaY) < 16) return;
    if (e.deltaY > 0 && atBoundary(true)) {
      wheelActedRef.current = true;
      tryAdvance();
    } else if (e.deltaY < 0 && atBoundary(false)) {
      wheelActedRef.current = true;
      tryPrev();
    }
  };
  const onTouchStart = (e: React.TouchEvent) => {
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (overlayOpen || touchY.current === null) return;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (dy > SWIPE && atBoundary(true)) tryAdvance();
    else if (dy < -SWIPE && atBoundary(false)) tryPrev();
    touchY.current = null;
  };

  const current = k.current;
  const isLast = k.index === k.total - 1;
  const gated = !k.canAdvance;

  let btnLabel: React.ReactNode = (
    <>
      <ArrowUp className="h-4 w-4" /> Lanjut
    </>
  );
  if (isLast && k.completed) btnLabel = (<><Trophy className="h-4 w-4" /> Lihat Skor</>);
  else if (gated && k.pendingSkip) btnLabel = (<><SkipForward className="h-4 w-4" /> Lewatin (dihitung 0)</>);
  else if (gated) btnLabel = <span>Jawab dulu</span>;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.985, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <KilatProgressBar
        chapters={feed.chapters}
        cards={k.cards}
        index={k.index}
        reached={k.reached}
        points={k.points}
        gradedTotal={k.gradedTotal}
        onClose={onClose}
        onOpenOutline={() => setShowOutline(true)}
        onJumpChapter={(n) => jump(k.firstIndexOfChapter(n))}
        onRestart={doRestart}
        aiActive={aiOpen}
        onToggleAi={() => setAiOpen((o) => !o)}
      />

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
            <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain px-5 py-6">
              <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center">
                {current && (
                  <KilatCardView
                    card={current}
                    response={k.responses[current.id]}
                    onAnswer={(correct, data) => k.answer(current, correct, data)}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom control */}
      <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-2">
        {gated && k.pendingSkip && (
          <p className="mb-1.5 text-center text-xs text-amber-600 dark:text-amber-400">
            Belum dijawab. Pencet atau geser sekali lagi buat lewatin.
          </p>
        )}
        <div className="mx-auto flex max-w-lg items-center gap-2.5">
          {k.index > 0 && (
            <button
              type="button"
              onClick={tryPrev}
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
              tryAdvance();
            }}
            className="hs-press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            {btnLabel}
          </button>
        </div>
      </div>

      {/* Outline (jump) */}
      <AnimatePresence>
        {showOutline && (
          <KilatOutline
            chapters={feed.chapters}
            cards={k.cards}
            index={k.index}
            cardStatus={k.cardStatus}
            onJump={jump}
            onClose={() => setShowOutline(false)}
            onRestart={doRestart}
          />
        )}
      </AnimatePresence>

      {/* Completion */}
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
              scorePct={k.scorePct}
              points={k.points}
              gradedTotal={k.gradedTotal}
              passed={k.passed}
              onRestart={() => {
                k.reset();
                setShowComplete(false);
              }}
              onClose={onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* One-time tutorial */}
      <AnimatePresence>
        {showTutorial && <KilatTutorial onDismiss={dismissTutorial} />}
      </AnimatePresence>

      {/* HiStudy AI helper - opened from the top-bar button, grounded to the
          active card. Hidden while another overlay is up; minimize keeps its
          window position, close (X) resets it. */}
      {current && (
        <KilatAiDock
          open={aiOpen && !overlayOpen}
          subjectId={subjectId}
          card={current}
          geom={aiGeom}
          onGeom={setAiGeom}
          onMinimize={() => setAiOpen(false)}
          onClose={() => {
            setAiOpen(false);
            setAiGeom(null);
          }}
        />
      )}
    </motion.div>
  );
}
