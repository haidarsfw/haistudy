"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Flame, Trophy, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useStudyStreak } from "@/hooks/use-study-streak";
import { subjects } from "@/data/subjects";
import { getContentBySubjectId } from "@/data/content";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { SubjectProgress } from "@/types";

function getProgress(): Record<string, SubjectProgress> {
  try {
    const raw = localStorage.getItem("hs-progress");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getQuizScores(): Record<string, { score: number; total: number }> {
  try {
    const raw = localStorage.getItem("hs-progress");
    if (!raw) return {};
    const progress = JSON.parse(raw) as Record<string, SubjectProgress>;
    const scores: Record<string, { score: number; total: number }> = {};
    for (const [subjectId, p] of Object.entries(progress)) {
      if (p.quizScores) {
        // Get latest quiz score
        const entries = Object.entries(p.quizScores);
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          scores[subjectId] = latest[1];
        }
      }
    }
    return scores;
  } catch {
    return {};
  }
}

export default function AnalyticsPage() {
  const { session } = useSession();
  const { t } = useTranslation();
  const { currentStreak, bestStreak, recordActivity } = useStudyStreak();
  const [progress, setProgress] = useState<Record<string, SubjectProgress>>({});
  const [quizScores, setQuizScores] = useState<Record<string, { score: number; total: number }>>({});

  useEffect(() => {
    setProgress(getProgress());
    setQuizScores(getQuizScores());
    recordActivity();
  }, [recordActivity]);

  if (!session) return null;

  // Calculate per-subject completion
  const subjectStats = subjects.map((subject) => {
    const content = getContentBySubjectId(subject.id);
    const sp = progress[subject.id];

    const materiTotal = content?.materi?.length || 0;
    const materiDone = sp?.materi?.length || 0;
    const flashcardsDone = sp?.flashcardsCompleted ? 1 : 0;
    const quizEntries = sp?.quizScores ? Object.keys(sp.quizScores).length : 0;

    const total = materiTotal + 1 + 1; // materi items + flashcards + quiz
    const done = materiDone + flashcardsDone + (quizEntries > 0 ? 1 : 0);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const quizScore = quizScores[subject.id];

    return {
      subject,
      materiDone,
      materiTotal,
      flashcardsDone: sp?.flashcardsCompleted || false,
      quizScore,
      percent,
    };
  });

  const overallPercent =
    subjectStats.length > 0
      ? Math.round(
          subjectStats.reduce((sum, s) => sum + s.percent, 0) /
            subjectStats.length
        )
      : 0;

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("analytics.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("analytics.subtitle")}
          </p>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={staggerItem} className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {overallPercent}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("analytics.total_progress")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{currentStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("analytics.streak_days")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{bestStreak}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("analytics.streak_record")}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-subject progress */}
      <motion.div variants={staggerItem}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              {t("analytics.per_subject")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectStats.map(({ subject, materiDone, materiTotal, flashcardsDone, quizScore, percent }) => (
              <div key={subject.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate mr-2">{subject.name}</span>
                  <span className="text-muted-foreground shrink-0">{percent}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Details */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span>
                    {t("analytics.materials")} {materiDone}/{materiTotal}
                  </span>
                  <span>
                    {t("analytics.flashcards")} {flashcardsDone ? t("common.done") : "-"}
                  </span>
                  {quizScore && (
                    <span>
                      {t("analytics.quiz")} {quizScore.score}/{quizScore.total}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
