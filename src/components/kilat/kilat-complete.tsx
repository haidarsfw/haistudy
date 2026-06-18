"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PartyPopper, RotateCcw, ArrowLeft, Star, Target, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scaleIn, fadeInUp, staggerContainer, staggerItem } from "@/lib/motion";

interface Props {
  scorePct: number;
  points: number;
  gradedTotal: number;
  passed: boolean;
  onRestart: () => void;
  onClose: () => void;
}

const CONFETTI_COLORS = ["var(--primary)", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9"];

interface ConfettiPiece {
  left: number;
  delay: number;
  dur: number;
  color: string;
  size: number;
}

export function KilatComplete({ scorePct, points, gradedTotal, passed, onRestart, onClose }: Props) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  useEffect(() => {
    if (!passed) return;
    setConfetti(
      Array.from({ length: 28 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      }))
    );
  }, [passed]);

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center">
      {passed && (
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
      )}

      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="relative">
        <div
          className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-warm-lg ${
            passed ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
          }`}
        >
          {passed ? <PartyPopper className="h-10 w-10" /> : <RefreshCw className="h-10 w-10" />}
        </div>
        <h2 className="font-heading text-3xl font-bold">{passed ? "Lulus, mantap!" : "Belum lulus nih"}</h2>
        <p
          className={`mt-3 font-heading text-5xl font-extrabold tabular-nums ${
            passed ? "text-emerald-500" : "text-amber-500"
          }`}
        >
          {scorePct}%
        </p>
        <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          {passed
            ? "Kamu lewat KKM 90%. Materinya udah lumayan nempel. Boleh diulang kalau mau makin lancar."
            : "KKM-nya 90%. Mending diulang dulu biar lebih paham dan nempel, tapi santai, gak maksa kok."}
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="relative mt-7 grid w-full max-w-[260px] grid-cols-2 gap-2.5"
      >
        <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-3 shadow-warm">
          <Target className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">{scorePct}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Skor</p>
        </motion.div>
        <motion.div variants={staggerItem} className="rounded-2xl border border-border bg-card p-3 shadow-warm">
          <Star className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 font-heading text-lg font-bold tabular-nums">
            {points}/{gradedTotal}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Poin</p>
        </motion.div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="relative mt-7 flex items-center gap-2.5"
      >
        <Button variant={passed ? "outline" : "default"} size="lg" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" />
          Ulangi
        </Button>
        <Button variant={passed ? "default" : "outline"} size="lg" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Button>
      </motion.div>
    </div>
  );
}
