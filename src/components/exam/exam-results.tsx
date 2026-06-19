"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Star, BookOpen, Flame, ArrowLeft, RotateCcw, ChevronDown } from "lucide-react";
import type { ExamData, ExamGradingResult } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface Props {
  exam: ExamData;
  gradingResults: ExamGradingResult[];
  totalScore: number;
  maxScore: number;
  scorePct: number;
  durationUsedSeconds: number | null;
  autoSubmitted: boolean;
  userAnswers: Record<string, string>;
  examLanguage: "en" | "id";
  onClose: () => void;
  onRetry?: () => void;
}

function getGrade(pct: number) {
  if (pct >= 85) return { icon: Trophy, label: "exam.results_grade_excellent", color: "text-emerald-500", bg: "bg-emerald-500" };
  if (pct >= 70) return { icon: Star, label: "exam.results_grade_good", color: "text-blue-500", bg: "bg-blue-500" };
  if (pct >= 55) return { icon: BookOpen, label: "exam.results_grade_average", color: "text-amber-500", bg: "bg-amber-500" };
  return { icon: Flame, label: "exam.results_grade_keep_going", color: "text-orange-500", bg: "bg-orange-500" };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function ExamResults({
  exam,
  gradingResults,
  totalScore,
  maxScore,
  scorePct,
  durationUsedSeconds,
  autoSubmitted,
  userAnswers,
  examLanguage,
  onClose,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const [showReview, setShowReview] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  const grade = getGrade(scorePct);
  const GradeIcon = grade.icon;

  // Animated score counter
  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedScore(Math.round(eased * totalScore * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [totalScore]);

  // Group results by section
  const essayResults = gradingResults.filter((r) =>
    r.questionId.startsWith("essay")
  );
  const caseResults = gradingResults.filter((r) =>
    r.questionId.startsWith("case")
  );
  const essayTotal = essayResults.reduce((s, r) => s + r.score, 0);
  const essayMax = essayResults.reduce((s, r) => s + r.maxPoints, 0);
  const caseTotal = caseResults.reduce((s, r) => s + r.score, 0);
  const caseMax = caseResults.reduce((s, r) => s + r.maxPoints, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] overflow-y-auto bg-background"
    >
      <div className="mx-auto max-w-2xl px-5 py-8">
        <motion.div
          variants={staggerContainer(0.08)}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Score Hero */}
          <motion.div variants={staggerItem} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
              className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full ${grade.bg}/10`}
            >
              <GradeIcon className={`h-12 w-12 ${grade.color}`} />
            </motion.div>

            <h1 className="mb-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("exam.results_score")}
            </h1>

            <p className="text-5xl font-black tabular-nums text-foreground">
              {animatedScore}
              <span className="text-2xl text-muted-foreground">/{maxScore}</span>
            </p>

            <p className={`mt-2 text-lg font-bold ${grade.color}`}>
              {t(grade.label)} ({scorePct}%)
            </p>

            {durationUsedSeconds != null && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("exam.results_duration")
                  .replace("{m}", String(Math.floor(durationUsedSeconds / 60)))
                  .replace("{s}", String(durationUsedSeconds % 60))}
              </p>
            )}

            {autoSubmitted && (
              <p className="mt-1 text-xs font-medium text-amber-500">
                {t("exam.results_auto")}
              </p>
            )}
          </motion.div>

          {/* Score Breakdown */}
          <motion.div variants={staggerItem}>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              {t("exam.results_breakdown")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <ScoreBar
                label={t("exam.results_essay_section")}
                score={essayTotal}
                max={essayMax}
              />
              <ScoreBar
                label={t("exam.results_case_section")}
                score={caseTotal}
                max={caseMax}
              />
            </div>

            {/* Per-question mini scores */}
            <div className="mt-3 flex flex-wrap gap-2">
              {gradingResults.map((r) => {
                const pct = r.maxPoints > 0 ? (r.score / r.maxPoints) * 100 : 0;
                let dotColor = "bg-red-400";
                if (pct >= 80) dotColor = "bg-emerald-400";
                else if (pct >= 50) dotColor = "bg-amber-400";

                return (
                  <div
                    key={r.questionId}
                    className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1"
                  >
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {r.questionId.replace("essay-", "E").replace("case-", "C")}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground">
                      {r.score}/{r.maxPoints}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Review toggle */}
          <motion.div variants={staggerItem}>
            <button
              type="button"
              onClick={() => setShowReview((v) => !v)}
              className="hs-press flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground"
            >
              📖 {t("exam.review_title")}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showReview ? "rotate-180" : ""}`}
              />
            </button>
          </motion.div>

          {/* Full review (pembahasan) */}
          {showReview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-4 overflow-hidden"
            >
              {gradingResults.map((result) => (
                <ReviewCard
                  key={result.questionId}
                  result={result}
                  exam={exam}
                  userAnswer={userAnswers[result.questionId] ?? ""}
                  examLanguage={examLanguage}
                  t={t}
                />
              ))}
            </motion.div>
          )}

          {/* Actions */}
          <motion.div variants={staggerItem} className="flex gap-3 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="hs-press flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("exam.results_back")}
            </button>
            <button
              type="button"
              onClick={onRetry ?? onClose}
              className="hs-press flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw className="h-4 w-4" />
              {t("exam.results_retry")}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ScoreBar({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  let barColor = "bg-red-400";
  if (pct >= 80) barColor = "bg-emerald-400";
  else if (pct >= 50) barColor = "bg-amber-400";

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">
        {Math.round(score * 10) / 10}
        <span className="text-sm text-muted-foreground">/{max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
}

function ReviewCard({
  result,
  exam,
  userAnswer,
  examLanguage,
  t,
}: {
  result: ExamGradingResult;
  exam: ExamData;
  userAnswer: string;
  examLanguage: "en" | "id";
  t: (key: string) => string;
}) {
  const pct =
    result.maxPoints > 0 ? (result.score / result.maxPoints) * 100 : 0;
  let borderColor = "border-red-300 dark:border-red-800";
  if (pct >= 80)
    borderColor = "border-emerald-300 dark:border-emerald-800";
  else if (pct >= 50)
    borderColor = "border-amber-300 dark:border-amber-800";

  // Find question title
  let title = result.questionId;
  for (const q of exam.questions) {
    if (q.id === result.questionId) {
      title = q.title[examLanguage];
      break;
    }
    if (q.subQuestions) {
      const sub = q.subQuestions.find((s) => s.id === result.questionId);
      if (sub) {
        title = `${q.title[examLanguage]} — ${result.questionId.replace(q.id + "-", "").replace("case-", "")}`;
        break;
      }
    }
  }

  // Find answer key
  const answerKey = exam.answerKeys.find(
    (k) => k.questionId === result.questionId
  );

  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-card overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {result.score}/{result.maxPoints}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {/* Original question (soal asli) */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            📋 {t("exam.review_question")}
          </p>
          {(() => {
            // Find the question text
            for (const q of exam.questions) {
              if (q.id === result.questionId) {
                return (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed text-foreground/90">
                    {q.question?.[examLanguage] || q.context?.[examLanguage] || "—"}
                    {q.subQuestions && (
                      <ul className="mt-2 space-y-1 pl-4 list-disc text-xs text-foreground/70">
                        {q.subQuestions.map((sub, i) => (
                          <li key={sub.id}>
                            <span className="font-semibold">{String.fromCharCode(97 + i)})</span>{" "}
                            {sub.question[examLanguage]} ({sub.points}p)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }
              if (q.subQuestions) {
                const sub = q.subQuestions.find((s) => s.id === result.questionId);
                if (sub) {
                  return (
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm leading-relaxed text-foreground/90">
                      {q.context && (
                        <p className="mb-2 text-xs italic text-muted-foreground">
                          {q.context[examLanguage]}
                        </p>
                      )}
                      {sub.question[examLanguage]}
                    </div>
                  );
                }
              }
            }
            return null;
          })()}
        </div>

        {/* User's answer */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            📝 {t("exam.review_your_answer")}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground/80">
            {userAnswer.trim() || (
              <span className="italic text-muted-foreground">
                {t("exam.review_empty_answer")}
              </span>
            )}
          </div>
        </div>

        {/* Reference answer */}
        {answerKey && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ✅ {t("exam.review_reference")}
            </p>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm leading-relaxed text-foreground/90 dark:border-emerald-900 dark:bg-emerald-950/20">
              {answerKey.referenceAnswer}
            </div>
          </div>
        )}

        {/* AI feedback */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">
            📊 {t("exam.review_ai_feedback")}
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">
            {result.feedback}
          </p>
        </div>

        {/* Key points */}
        {result.keyPointsMatched.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              ✅ {t("exam.review_matched")}
            </p>
            <ul className="space-y-0.5 text-sm text-foreground/80">
              {result.keyPointsMatched.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.keyPointsMissed.length > 0 && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
              ❌ {t("exam.review_missed")}
            </p>
            <ul className="space-y-0.5 text-sm text-foreground/80">
              {result.keyPointsMissed.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rubric */}
        {answerKey && (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              📋 {t("exam.review_rubric")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {answerKey.rubric}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
