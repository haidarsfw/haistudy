"use client";

import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";
import type { SubjectProgress } from "@/types";

function calcOverallProgress(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem("hs-progress");
    const allProgress: Record<string, SubjectProgress> = raw
      ? JSON.parse(raw)
      : {};
    const defaultProgress: SubjectProgress = {
      materi: [],
      flashcardsCompleted: false,
      quizScores: {},
    };

    let total = 0;
    let sum = 0;
    for (const s of subjects) {
      const c = content[s.id];
      if (!c) continue;
      total++;
      const p = allProgress[s.id] || defaultProgress;
      let sections = 0;
      let completed = 0;
      if (c.materi.length > 0) {
        sections++;
        completed += p.materi.length / c.materi.length;
      }
      if (c.flashcards.length > 0) {
        sections++;
        if (p.flashcardsCompleted) completed += 1;
      }
      if (c.quiz.length > 0) {
        sections++;
        if (Object.keys(p.quizScores).length > 0) completed += 1;
      }
      sum += sections > 0 ? completed / sections : 0;
    }
    return total > 0 ? Math.round((sum / total) * 100) : 0;
  } catch {
    return 0;
  }
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 22;
  const stroke = 4;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const size = (r + stroke) * 2;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-sm font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export function StudyProgressMini() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(calcOverallProgress());
  }, []);

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboard.progress")}
        </span>
      </div>
      <div className="flex items-center justify-center py-1">
        <ProgressRing percent={progress} />
      </div>
    </motion.div>
  );
}
