"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Flame,
  Trophy,
  BookOpen,
  CalendarCheck,
  Clock,
  Award,
  Timer,
  CalendarDays,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useStudyStreak } from "@/hooks/use-study-streak";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import {
  useAnalyticsSummary,
  type AnalyticsAttempt,
} from "@/hooks/use-analytics-summary";
import { AttemptDetailDialog } from "@/components/exam/attempt-detail-dialog";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { getAllProgress, calcSubjectPercent } from "@/lib/progress";
import { formatHM, formatMinutesHM, formatDuration } from "@/lib/format";
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

function pctTone(pct: number | null): string {
  if (pct == null) return "text-muted-foreground";
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 60) return "text-amber-500";
  return "text-rose-500";
}

export default function AnalyticsPage() {
  const { session } = useSession();
  const { t, locale } = useTranslation();
  const { currentStreak, bestStreak, activeDates, recordActivity } =
    useStudyStreak();
  const { subjects, content: scopedContent } = useScopedData();
  const scopeCtx = useOptionalScope();
  const licenseKey = session?.licenseKey ?? "";
  const scopeKey = scopeCtx?.scopeKey ?? "";
  const [progress, setProgress] = useState<Record<string, SubjectProgress>>({});
  const [quizScores, setQuizScores] = useState<
    Record<string, { score: number; total: number }>
  >({});
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(
    null
  );
  const [showAllAttempts, setShowAllAttempts] = useState(false);

  const { attempts, stats, totalOnlineMinutes, memberSince, loading } =
    useAnalyticsSummary(licenseKey, scopeKey);

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

  const dateLocale = locale === "id" ? "id-ID" : "en-US";
  const subjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name ?? id;

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

  const examSubjects = subjects.filter(
    (s) => (stats.perSubject[s.id]?.attempts ?? 0) > 0
  );

  // Riwayat default: ONE row per mata kuliah (the latest attempt — `attempts`
  // arrives created_at desc). Full list shown on "Tampilkan Semua".
  const latestPerSubject: AnalyticsAttempt[] = [];
  {
    const seen = new Set<string>();
    for (const a of attempts) {
      if (seen.has(a.subject_id)) continue;
      seen.add(a.subject_id);
      latestPerSubject.push(a);
    }
  }

  const openAttempt = (id: string) => {
    setShowAllAttempts(false);
    setSelectedAttemptId(id);
  };

  const renderAttemptRow = (a: AnalyticsAttempt) => (
    <button
      type="button"
      key={a.id}
      onClick={() => openAttempt(a.id)}
      className="flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{subjectName(a.subject_id)}</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>
            {new Date(a.submitted_at ?? a.created_at).toLocaleDateString(
              dateLocale,
              { day: "numeric", month: "short" }
            )}
          </span>
          {a.duration_used_seconds != null && (
            <span>· {formatDuration(a.duration_used_seconds)}</span>
          )}
          {a.auto_submitted && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">
              {t("analytics.auto")}
            </span>
          )}
        </div>
      </div>
      <span
        className={`shrink-0 font-bold tabular-nums ${pctTone(a.score_pct)}`}
      >
        {a.score_pct != null ? `${Math.round(a.score_pct)}%` : "—"}
      </span>
    </button>
  );

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
      <motion.div
        variants={staggerItem}
        className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {overallPercent}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("analytics.total_progress")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{currentStreak}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("analytics.streak_days")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-bold">{bestStreak}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("analytics.streak_record")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <CalendarCheck className="h-5 w-5 text-sky-500" />
              <span className="text-2xl font-bold">{activeDates.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("analytics.active_days")}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Study time */}
      <motion.div variants={staggerItem} className="mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              {t("analytics.study_time")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" />
                  {t("analytics.exam_time")}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {formatHM(stats.totalExamSeconds)}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t("analytics.member_since")}
                </div>
                <div className="mt-1 text-lg font-bold">
                  {memberSince
                    ? new Date(memberSince).toLocaleDateString(dateLocale, {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              {totalOnlineMinutes > 0 && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {t("analytics.online_time")}
                    <Tooltip>
                      <TooltipTrigger
                        aria-label={t("analytics.online_time_note")}
                        className="inline-flex items-center text-muted-foreground/60 transition-colors hover:text-foreground"
                      >
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[220px] text-center leading-relaxed"
                      >
                        {t("analytics.online_time_note")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="mt-1 text-lg font-bold">
                    {formatMinutesHM(totalOnlineMinutes)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Per-subject progress (compact, kept above the exam scores) */}
      <motion.div variants={staggerItem} className="mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              {t("analytics.per_subject")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectStats.map(
              ({
                subject,
                materiDone,
                materiTotal,
                flashcardsDone,
                quizScore,
                percent,
              }) => (
                <div key={subject.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{subject.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {percent}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span>
                      {t("analytics.materials")} {materiDone}/{materiTotal}
                    </span>
                    <span>
                      {t("analytics.flashcards")}{" "}
                      {flashcardsDone ? t("common.done") : "-"}
                    </span>
                    <span>
                      {t("analytics.quiz")}{" "}
                      {quizScore
                        ? `${Math.round(quizScore.score)}/${quizScore.total}`
                        : "-"}
                    </span>
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Practice exam scores */}
      <motion.div variants={staggerItem} className="mb-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4" />
              {t("analytics.exam_scores")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">
                {t("analytics.loading_stats")}
              </p>
            ) : stats.totalAttempts === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("analytics.no_exams")}
              </p>
            ) : (
              <div className="space-y-5">
                {/* Global summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <div className="text-xl font-bold">
                      {stats.totalAttempts}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("analytics.total_attempts")}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <div className={`text-xl font-bold ${pctTone(stats.bestPct)}`}>
                      {stats.bestPct != null ? `${Math.round(stats.bestPct)}%` : "—"}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("analytics.best_score")}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-center">
                    <div className={`text-xl font-bold ${pctTone(stats.avgPct)}`}>
                      {stats.avgPct != null ? `${stats.avgPct}%` : "—"}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("analytics.avg_score")}
                    </p>
                  </div>
                </div>

                {/* Per-subject best */}
                {examSubjects.length > 0 && (
                  <div className="space-y-2">
                    {examSubjects.map((s) => {
                      const st = stats.perSubject[s.id];
                      return (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              {st.attempts} {t("analytics.attempts_count")}
                            </span>
                            <span
                              className={`font-semibold tabular-nums ${pctTone(st.bestPct)}`}
                            >
                              {st.bestPct != null
                                ? `${Math.round(st.bestPct)}%`
                                : "—"}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent attempts — 1 row per mata kuliah; all on Tampilkan Semua */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {t("analytics.recent_attempts")}
                  </p>
                  <div className="space-y-1.5">
                    {latestPerSubject.map(renderAttemptRow)}
                  </div>
                  {attempts.length > latestPerSubject.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAllAttempts(true)}
                    >
                      {t("analytics.show_all")} ({attempts.length})
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* All attempts (Tampilkan Semua) */}
      <Dialog open={showAllAttempts} onOpenChange={setShowAllAttempts}>
        <DialogContent className="max-h-[85vh] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              {t("analytics.all_attempts")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("analytics.exam_scores")}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-1.5 overflow-y-auto overscroll-contain pr-1">
            {attempts.map(renderAttemptRow)}
          </div>
        </DialogContent>
      </Dialog>

      <AttemptDetailDialog
        attemptId={selectedAttemptId}
        onClose={() => setSelectedAttemptId(null)}
        labelFor={subjectName}
      />
    </motion.div>
  );
}
