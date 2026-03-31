"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { SubjectIcon } from "@/components/shared/subject-icon";
import { useTranslation } from "@/components/providers/language-provider";
import type { SubjectProgress } from "@/types";

function getAllProgress(): Record<string, SubjectProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("hs-progress");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function calcPercent(
  progress: SubjectProgress,
  totalMateri: number,
  hasFlashcards: boolean,
  hasQuiz: boolean
): number {
  let sections = 0;
  let completed = 0;

  if (totalMateri > 0) {
    sections++;
    completed += progress.materi.length / totalMateri;
  }
  if (hasFlashcards) {
    sections++;
    if (progress.flashcardsCompleted) completed += 1;
  }
  if (hasQuiz) {
    sections++;
    if (Object.keys(progress.quizScores).length > 0) completed += 1;
  }

  return sections > 0 ? Math.round((completed / sections) * 100) : 0;
}

export function StudyProgressCard() {
  const { t } = useTranslation();
  const [progressData, setProgressData] = useState<
    { id: string; name: string; icon: string; color: string; percent: number }[]
  >([]);
  const [overall, setOverall] = useState(0);

  useEffect(() => {
    const allProgress = getAllProgress();
    const defaultProgress: SubjectProgress = {
      materi: [],
      flashcardsCompleted: false,
      quizScores: {},
    };

    const data = subjects.map((s) => {
      const subContent = content[s.id];
      const progress = allProgress[s.id] || defaultProgress;
      const percent = subContent
        ? calcPercent(
            progress,
            subContent.materi.length,
            subContent.flashcards.length > 0,
            subContent.quiz.length > 0
          )
        : 0;
      return { id: s.id, name: s.name, icon: s.icon, color: s.color, percent };
    });

    setProgressData(data);
    const avg =
      data.length > 0
        ? Math.round(data.reduce((sum, d) => sum + d.percent, 0) / data.length)
        : 0;
    setOverall(avg);
  }, []);

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("dashboard.progress")}</h3>
        <span className="ml-auto text-lg font-bold text-primary tabular-nums">
          {overall}%
        </span>
      </div>

      {/* Overall bar */}
      <div className="h-2 w-full rounded-full bg-border overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${overall}%` }}
        />
      </div>

      {/* Per-subject */}
      <div className="space-y-3">
        {progressData.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5">
            <SubjectIcon icon={s.icon} className={`h-5 w-5 shrink-0 ${s.color}`} />
            <span className="text-xs font-medium min-w-0 truncate flex-1">
              {s.name}
            </span>
            <div className="h-1.5 w-16 sm:w-20 rounded-full bg-border overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
                style={{ width: `${s.percent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-8 text-right">
              {s.percent}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
