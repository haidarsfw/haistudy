"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Trophy,
  Star,
  BookOpen,
  Flame,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { ExamData, ExamGradingResult } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { ExamMarkdown } from "./exam-markdown";
import { ExamGradingLoader, buildGradingUnits } from "./exam-grading-loader";

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
  /** Re-grade saved answers in place. May be async; resolves on success. */
  onRegrade?: () => void | Promise<void>;
  /** Times the user left the exam tab (anti-exploit audit; live attempts only). */
  awayCount?: number;
}

type ReviewFilter = "all" | "ok" | "partial" | "wrong";

function getGrade(pct: number) {
  if (pct >= 85) return { icon: Trophy, label: "exam.results_grade_excellent", color: "text-emerald-500", bg: "bg-emerald-500" };
  if (pct >= 70) return { icon: Star, label: "exam.results_grade_good", color: "text-blue-500", bg: "bg-blue-500" };
  if (pct >= 55) return { icon: BookOpen, label: "exam.results_grade_average", color: "text-amber-500", bg: "bg-amber-500" };
  return { icon: Flame, label: "exam.results_grade_keep_going", color: "text-orange-500", bg: "bg-orange-500" };
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
  onRegrade,
  awayCount,
}: Props) {
  const { t } = useTranslation();
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [activeIdx, setActiveIdx] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [regrading, setRegrading] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const lang = examLanguage;
  // Units for the regrade progress loader (same numbering as the review).
  const gradingUnits = useMemo(() => buildGradingUnits(exam, lang), [exam, lang]);

  const statusOf = (r: ExamGradingResult): "ok" | "partial" | "wrong" => {
    const pct = r.maxPoints > 0 ? (r.score / r.maxPoints) * 100 : 0;
    return pct >= 80 ? "ok" : pct >= 50 ? "partial" : "wrong";
  };

  const grade = getGrade(scorePct);
  const GradeIcon = grade.icon;

  // Display order = the exam's question order (1, 1a, 1b, 2, 3 …), NOT the
  // grading/return order — so the review + TOC + Prev/Next always read 1→last
  // regardless of which filter is active.
  const orderedResults = useMemo(() => {
    const pos = new Map<string, number>();
    let i = 0;
    for (const q of exam.questions) {
      if (q.subQuestions && q.subQuestions.length > 0) {
        for (const s of q.subQuestions) pos.set(s.id, i++);
      } else {
        pos.set(q.id, i++);
      }
    }
    return [...gradingResults].sort(
      (a, b) => (pos.get(a.questionId) ?? 1e9) - (pos.get(b.questionId) ?? 1e9)
    );
  }, [exam, gradingResults]);

  // Cards visible under the current filter (drives the Prev/Next stepper + TOC).
  const filtered = orderedResults.filter(
    (r) => reviewFilter === "all" || statusOf(r) === reviewFilter
  );
  const activeId =
    filtered[Math.min(activeIdx, Math.max(0, filtered.length - 1))]?.questionId;

  const scrollToUnit = (id: string) =>
    document
      .getElementById(`review-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  // TOC jump: open the review, reset to "all", scroll to the question's card.
  const jumpToReview = (id: string) => {
    setShowReview(true);
    setReviewFilter("all");
    const idx = orderedResults.findIndex((r) => r.questionId === id);
    if (idx >= 0) setActiveIdx(idx);
    setTimeout(() => scrollToUnit(id), 120);
  };

  // Step Prev/Next through the filtered discussion list.
  const stepReview = (delta: number) => {
    if (filtered.length === 0) return;
    const ni = Math.max(0, Math.min(filtered.length - 1, activeIdx + delta));
    setActiveIdx(ni);
    const id = filtered[ni]?.questionId;
    if (id) scrollToUnit(id);
  };

  const pickFilter = (f: ReviewFilter) => {
    setReviewFilter(f);
    setActiveIdx(0);
  };

  // Re-grade in place: inline overlay, then a success/error toast (#14).
  const doRegrade = async () => {
    if (!onRegrade || regrading) return;
    setRegrading(true);
    try {
      await onRegrade();
      setToast({ kind: "ok", msg: t("exam.regrade_success") });
    } catch {
      setToast({ kind: "err", msg: t("exam.regrade_error_title") });
    } finally {
      setRegrading(false);
      setTimeout(() => setToast(null), 3200);
    }
  };

  const filters: ReviewFilter[] = ["all", "ok", "partial", "wrong"];

  // Animated score counter
  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * totalScore * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [totalScore]);

  // Scroll-spy: keep activeIdx synced to the card currently at the top of the
  // viewport, so Prev/Next always step from what the user is actually reading
  // (fixes "Prev/Next kadang tidak jalan" after manual scrolling). setState runs
  // in the observer callback, not synchronously in the effect body.
  useEffect(() => {
    if (!showReview) return;
    const ids = filtered.map((r) => r.questionId);
    if (ids.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting);
        if (vis.length === 0) return;
        vis.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const topId = vis[0].target.id.replace("review-", "");
        const idx = ids.indexOf(topId);
        if (idx >= 0) setActiveIdx(idx);
      },
      { rootMargin: "-150px 0px -55% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(`review-${id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
    // filtered is derived from these; recompute observers when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReview, reviewFilter, orderedResults]);

  // Map each answer unit -> { section heading, short code } from the exam shape.
  const unitMeta = useMemo(() => {
    const meta: Record<string, { section: string; code: string }> = {};
    exam.questions.forEach((q, i) => {
      const section = q.sectionLabel[lang].split("(")[0].trim();
      if (q.subQuestions && q.subQuestions.length > 0) {
        q.subQuestions.forEach((s, j) => {
          meta[s.id] = { section, code: `${i + 1}${String.fromCharCode(97 + j)}` };
        });
      } else {
        meta[q.id] = { section, code: `${i + 1}` };
      }
    });
    return meta;
  }, [exam, lang]);

  // Score breakdown per real section (Type I / II / III ...).
  // Order follows the exam's natural question order (Type I first → LEFT), NOT
  // the grading-result return order — gradeChunked runs chunks concurrently so
  // results can arrive out of order (which previously put Type II on the left).
  const sections = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, { score: number; max: number }> = {};
    // 1. Seed the order + buckets from the exam shape (same section string as
    //    unitMeta: text before the first "(", trimmed).
    for (const q of exam.questions) {
      const section = q.sectionLabel[lang].split("(")[0].trim();
      if (!map[section]) {
        map[section] = { score: 0, max: 0 };
        order.push(section);
      }
    }
    // 2. Sum scores from the grading results into their section bucket.
    for (const r of gradingResults) {
      const section = unitMeta[r.questionId]?.section ?? "—";
      if (!map[section]) {
        map[section] = { score: 0, max: 0 };
        order.push(section);
      }
      map[section].score += r.score;
      map[section].max += r.maxPoints;
    }
    return order.map((s) => ({ label: s, ...map[s] }));
  }, [exam, lang, gradingResults, unitMeta]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] overflow-y-auto overscroll-none bg-background"
    >
      {/* Sticky action bar — compact score + always-visible actions (no scroll). */}
      <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-border bg-background/90 px-3 py-2 backdrop-blur sm:px-4">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${grade.bg}/10`}>
          <GradeIcon className={`h-4 w-4 ${grade.color}`} />
        </span>
        <p className="min-w-0 truncate text-sm font-bold leading-tight text-foreground">
          {totalScore}
          <span className="text-muted-foreground">/{maxScore}</span>
          <span className={`ml-1.5 ${grade.color}`}>{scorePct}%</span>
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="hs-press flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground sm:px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t("exam.results_back")}</span>
          </button>
          {onRegrade && (
            <button
              type="button"
              onClick={doRegrade}
              disabled={regrading}
              className="hs-press flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-600 disabled:opacity-60 dark:text-amber-400 sm:px-3"
            >
              {regrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">{t("exam.regrade_btn").replace(/^🔄\s*/, "")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRetry ?? onClose}
            className="hs-press flex h-9 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-bold text-primary-foreground sm:px-3"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t("exam.results_retry")}</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-7">
        <motion.div
          variants={staggerContainer(0.07)}
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

            {awayCount != null && awayCount > 0 && (
              <p className="mt-1 text-xs font-medium text-amber-500">
                {t("exam.results_away").replace("{n}", String(awayCount))}
              </p>
            )}
          </motion.div>

          {/* Score Breakdown */}
          <motion.div variants={staggerItem}>
            <h3 className="mb-3 text-sm font-bold text-foreground">
              {t("exam.results_breakdown")}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {sections.map((s) => (
                <ScoreBar key={s.label} label={s.label} score={s.score} max={s.max} />
              ))}
            </div>

            {/* Per-unit mini scores — click to jump into the review (TOC) */}
            <div className="mt-3 flex flex-wrap gap-2">
              {orderedResults.map((r) => {
                const st = statusOf(r);
                const dotColor =
                  st === "ok" ? "bg-emerald-400" : st === "partial" ? "bg-amber-400" : "bg-red-400";
                return (
                  <button
                    key={r.questionId}
                    type="button"
                    onClick={() => jumpToReview(r.questionId)}
                    title={t("exam.review_jump")}
                    className="hs-press flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 hover:border-primary/50"
                  >
                    <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {unitMeta[r.questionId]?.code ?? r.questionId}
                    </span>
                    <span className="text-[10px] font-semibold text-foreground">
                      {r.score}/{r.maxPoints}
                    </span>
                  </button>
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

          {/* Full review (pembahasan) — sticky filter + Prev/Next stepper + TOC */}
          {showReview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Controls (sticky, just under the action bar) */}
              <div className="sticky top-[49px] z-20 -mx-1 space-y-2 bg-background/90 px-1 py-2 backdrop-blur">
                <div className="flex flex-wrap gap-2">
                  {filters.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => pickFilter(f)}
                      className={`hs-press rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        reviewFilter === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {t(`exam.review_filter_${f}`)}
                    </button>
                  ))}
                </div>
                {filtered.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => stepReview(-1)}
                      disabled={activeIdx <= 0}
                      className="hs-press flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t("exam.prev")}
                    </button>
                    <span className="flex-1 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                      {Math.min(activeIdx + 1, filtered.length)}/{filtered.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepReview(1)}
                      disabled={activeIdx >= filtered.length - 1}
                      className="hs-press flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground disabled:opacity-30"
                    >
                      {t("exam.next")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">—</p>
              ) : (
                filtered.map((result) => (
                  <div
                    key={result.questionId}
                    id={`review-${result.questionId}`}
                    className={`scroll-mt-44 rounded-2xl transition-shadow ${
                      result.questionId === activeId ? "ring-2 ring-primary/40" : ""
                    }`}
                  >
                    <ReviewCard
                      result={result}
                      exam={exam}
                      userAnswer={userAnswers[result.questionId] ?? ""}
                      examLanguage={examLanguage}
                      t={t}
                    />
                  </div>
                ))
              )}

              {/* Collapse back */}
              <button
                type="button"
                onClick={() => setShowReview(false)}
                className="hs-press flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-muted-foreground"
              >
                <ChevronUp className="h-4 w-4" />
                {t("exam.review_title")}
              </button>
            </motion.div>
          )}

          <div className="pb-4" />
        </motion.div>
      </div>

      {/* Toast (regrade result, #14) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4"
          >
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-lg ${
                toast.kind === "ok"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
              }`}
            >
              {toast.kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
              {toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline regrade overlay — same estimated-progress loader as submit,
          so re-grading shows the bar + "Sedang menilai…" + ETA instead of a
          bare spinner. Stays on the results screen (overlay variant). */}
      {regrading && (
        <ExamGradingLoader
          variant="overlay"
          title={t("exam.regrade_loading")}
          units={gradingUnits}
        />
      )}
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
      <p className="truncate text-xs font-semibold text-muted-foreground" title={label}>
        {label}
      </p>
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
  const pct = result.maxPoints > 0 ? (result.score / result.maxPoints) * 100 : 0;
  let borderColor = "border-red-300 dark:border-red-800";
  if (pct >= 80) borderColor = "border-emerald-300 dark:border-emerald-800";
  else if (pct >= 50) borderColor = "border-amber-300 dark:border-amber-800";

  // Resolve title + question text (handles single questions and sub-questions).
  let title = result.questionId;
  let questionMd: string | null = null;
  let contextMd: string | null = null;
  for (const q of exam.questions) {
    if (q.id === result.questionId) {
      title = q.title[examLanguage];
      questionMd = q.question?.[examLanguage] ?? null;
      contextMd = q.context?.[examLanguage] ?? null;
      break;
    }
    const sub = q.subQuestions?.find((s) => s.id === result.questionId);
    if (sub) {
      title = `${q.title[examLanguage]} — ${result.questionId}`;
      questionMd = sub.question[examLanguage];
      contextMd = q.context?.[examLanguage] ?? null;
      break;
    }
  }

  const answerKey = exam.answerKeys.find((k) => k.questionId === result.questionId);

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
        {/* Original question */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            📋 {t("exam.review_question")}
          </p>
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground/90">
            {contextMd && <ExamMarkdown content={contextMd} className="mb-2 text-muted-foreground" />}
            {questionMd ? <ExamMarkdown content={questionMd} /> : <span>—</span>}
          </div>
        </div>

        {/* User's answer */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            📝 {t("exam.review_your_answer")}
          </p>
          <div className="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-relaxed text-foreground/80">
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
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-foreground/90 dark:border-emerald-900 dark:bg-emerald-950/20">
              <ExamMarkdown content={answerKey.referenceAnswer} />
            </div>
          </div>
        )}

        {/* AI feedback */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">
            📊 {t("exam.review_ai_feedback")}
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
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
