"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Flame, Trophy, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useStudyStreak } from "@/hooks/use-study-streak";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getAllProgress, calcSubjectPercent } from "@/lib/progress";
import type { SubjectProgress } from "@/types";

// Best quiz score per subject, derived from the (already scope+account isolated)
// progress map passed in — NOT from the legacy global localStorage key.
function getQuizScores(
  progress: Record<string, SubjectProgress>
): Record<string, { score: number; total: number }> {
  const scores: Record<string, { score: number; total: number }> = {};
  for (const [subjectId, p] of Object.entries(progress)) {
    if (p.quizScores) {
      const entries = Object.values(p.quizScores);
      if (entries.length > 0) {
        // Get BEST quiz score (not latest)
        let best = entries[0];
        for (const entry of entries) {
          if (entry.score > best.score) best = entry;
        }
        scores[subjectId] = best;
      }
    }
  }
  return scores;
}

export default function AnalyticsPage() {
  const { session } = useSession();
  const { t } = useTranslation();
  const { currentStreak, bestStreak, recordActivity } = useStudyStreak();
  const { subjects, content: scopedContent } = useScopedData();
  const scopeCtx = useOptionalScope();
  const licenseKey = session?.licenseKey ?? "";
  const scopeKey = scopeCtx?.scopeKey ?? "";
  const [progress, setProgress] = useState<Record<string, SubjectProgress>>({});
  const [quizScores, setQuizScores] = useState<Record<string, { score: number; total: number }>>({});

  useEffect(() => {
    const refresh = () => {
      const p = getAllProgress(licenseKey, scopeKey);
      setProgress(p);
      setQuizScores(getQuizScores(p));
    };
    refresh();
    recordActivity();

    // Re-calculate when progress syncs from server or updates locally
    window.addEventListener("hs-progress-synced", refresh);
    window.addEventListener("hs-progress-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hs-progress-synced", refresh);
      window.removeEventListener("hs-progress-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [recordActivity, licenseKey, scopeKey]);

  if (!session) return null;

  const subjectStats = subjects.map((subject) => {
    const content = scopedContent[subject.id];
    const sp = progress[subject.id];

    const materiTotal = content?.materi?.length || 0;
    const materiDone = sp?.materi?.length || 0;
    const hasFlashcards = (content?.flashcards?.length || 0) > 0;
    const hasQuiz = (content?.quiz?.length || 0) > 0;
    const percent = calcSubjectPercent(sp, materiTotal, hasFlashcards, hasQuiz);
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
                  <span>
                    {t("analytics.quiz")}{" "}
                    {quizScore
                      ? `${Math.round(quizScore.score)}/${quizScore.total} poin`
                      : "-"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
