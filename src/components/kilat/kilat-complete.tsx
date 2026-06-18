"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PartyPopper, Zap, Flame, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scaleIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

interface Props {
  xp: number;
  bestStreak: number;
  chaptersDone: number;
  totalChapters: number;
  onRestart: () => void;
  onClose: () => void;
}

const CONFETTI_COLORS = [
  "var(--primary)",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#0ea5e9",
];

interface ConfettiPiece {
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
}

export function KilatComplete({
  xp,
  bestStreak,
  chaptersDone,
  totalChapters,
  onRestart,
  onClose,
}: Props) {
  // Randomize confetti once on mount (Math.random is impure - keep out of render).
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  useEffect(() => {
    setConfetti(
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      }))
    );
  }, []);

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {/* Confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <span
            key={i}
            className="kilat-confetti absolute top-0 rounded-[2px]"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * 1.6,
              background: c.color,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>

      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="relative">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-warm-lg">
          <PartyPopper className="h-10 w-10" />
        </div>
        <h2 className="font-heading text-3xl font-bold">Selesai!</h2>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Kamu udah ngelibas semua materi Business Ethics lewat Belajar Kilat.
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="relative mt-7 grid w-full max-w-xs grid-cols-3 gap-2.5"
      >
        <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-3 shadow-warm">
          <Zap className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">{xp}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</p>
        </motion.div>
        <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-3 shadow-warm">
          <Flame className="mx-auto h-5 w-5 text-amber-500" />
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">{bestStreak}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Streak</p>
        </motion.div>
        <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-3 shadow-warm">
          <PartyPopper className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">
            {chaptersDone}/{totalChapters}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bab</p>
        </motion.div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="relative mt-7 flex items-center gap-2.5"
      >
        <Button variant="outline" size="lg" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Ulangi
        </Button>
        <Button size="lg" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </motion.div>
    </div>
  );
}
