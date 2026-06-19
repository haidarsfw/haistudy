"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Send, Languages } from "lucide-react";
import type { ExamData, ExamAnswerSlot, UserExamAnswer, ExamGradingResult } from "@/types/exam";
import { ExamBriefing } from "./exam-briefing";
import { ExamTimer } from "./exam-timer";
import { ExamNavPanel } from "./exam-nav-panel";
import { ExamQuestionView } from "./exam-question-view";
import { ExamExitModal } from "./exam-exit-modal";
import { ExamSubmitModal } from "./exam-submit-modal";
import { ExamGradingLoader } from "./exam-grading-loader";
import { ExamResults } from "./exam-results";
import { useExam } from "@/hooks/use-exam";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface Props {
  exam: ExamData;
  subjectId: string;
  onClose: () => void;
}

const GRACE_PERIOD_S = 30;
const AUTOSAVE_KEY_PREFIX = "hs-exam-autosave-";

/**
 * Build a flat list of answerable slots from exam questions.
 * Each top-level question = 1 slot (6 total for the PDF format).
 * Case study sub-questions are rendered within the question view.
 */
function buildSlots(exam: ExamData): ExamAnswerSlot[] {
  return exam.questions.map((q, i) => ({
    questionId: q.id,
    label: String(i + 1),
    points: q.points,
    sectionType: q.type === "essay" ? "essay" : "case-study",
  }));
}

/** Find which top-level question a slot belongs to. */
function findQuestionForSlot(
  slot: ExamAnswerSlot,
  exam: ExamData
) {
  if (slot.parentId) {
    return exam.questions.find((q) => q.id === slot.parentId)!;
  }
  return exam.questions.find((q) => q.id === slot.questionId)!;
}

type Phase = "briefing" | "exam" | "grading" | "results";

export function ExamPlayer({ exam, subjectId, onClose }: Props) {
  const { t } = useTranslation();
  const { startExam, abandonExam, submitExam, quota } = useExam(subjectId);

  const [phase, setPhase] = useState<Phase>("briefing");
  const [examLanguage, setExamLanguage] = useState<"en" | "id">("id");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [gracePeriodActive, setGracePeriodActive] = useState(true);
  const [gradingResults, setGradingResults] = useState<ExamGradingResult[] | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(exam.meta.totalScore);
  const [scorePct, setScorePct] = useState(0);
  const [durationUsed, setDurationUsed] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);

  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const slots = buildSlots(exam);
  const currentSlot = slots[currentIndex];
  const currentQuestion = currentSlot ? findQuestionForSlot(currentSlot, exam) : null;

  // Count answered: for essays, check the main answer. For case studies,
  // count as answered if ALL sub-questions have answers >= 20 chars.
  const answeredCount = slots.filter((slot) => {
    const q = exam.questions.find((q) => q.id === slot.questionId);
    if (!q) return false;
    if (q.type === "essay") {
      return (answers[q.id] ?? "").trim().length >= 20;
    }
    // Case study: all sub-questions must be answered
    if (q.subQuestions) {
      return q.subQuestions.every(
        (sub) => (answers[sub.id] ?? "").trim().length >= 20
      );
    }
    return false;
  }).length;

  // ─── Phase: Briefing → Exam ───
  const handleStartExam = useCallback(async () => {
    try {
      const result = await startExam(exam.meta.examId, examLanguage);
      setAttemptId(result.attemptId);
      setStartedAt(result.startedAt);
      setPhase("exam");
      setGracePeriodActive(true);

      // Grace period timer
      graceTimerRef.current = setTimeout(() => {
        setGracePeriodActive(false);
      }, GRACE_PERIOD_S * 1000);

      // Restore autosaved answers if any
      try {
        const saved = localStorage.getItem(
          AUTOSAVE_KEY_PREFIX + result.attemptId
        );
        if (saved) setAnswers(JSON.parse(saved));
      } catch { /* ignore */ }
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  }, [exam.meta.examId, examLanguage, startExam]);

  // ─── Autosave ───
  useEffect(() => {
    if (phase !== "exam" || !attemptId) return;
    autosaveRef.current = setInterval(() => {
      try {
        localStorage.setItem(
          AUTOSAVE_KEY_PREFIX + attemptId,
          JSON.stringify(answers)
        );
      } catch { /* ignore */ }
    }, 5000);
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [phase, attemptId, answers]);

  // ─── Answer change ───
  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    },
    []
  );

  // ─── Navigation ───
  const goNext = useCallback(() => {
    if (currentIndex < slots.length - 1) {
      setCurrentIndex((i) => i + 1);
      sounds.click();
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentIndex, slots.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      sounds.click();
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentIndex]);

  const jumpTo = useCallback((i: number) => {
    setCurrentIndex(i);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ─── Submit ───
  const doSubmit = useCallback(
    async (auto = false) => {
      if (!attemptId) return;
      setShowSubmit(false);
      setPhase("grading");

      // Expand slots: essays submit as-is, case studies expand into sub-question answers
      const userAnswers: UserExamAnswer[] = [];
      const now = new Date().toISOString();
      for (const slot of slots) {
        const q = exam.questions.find((q) => q.id === slot.questionId);
        if (!q) continue;
        if (q.type === "essay") {
          userAnswers.push({
            questionId: q.id,
            answer: answers[q.id] ?? "",
            answeredAt: now,
          });
        } else if (q.subQuestions) {
          for (const sub of q.subQuestions) {
            userAnswers.push({
              questionId: sub.id,
              answer: answers[sub.id] ?? "",
              answeredAt: now,
            });
          }
        }
      }

      try {
        const result = await submitExam(attemptId, userAnswers, auto);
        setGradingResults(result.gradingResults);
        setTotalScore(result.totalScore);
        setMaxScore(result.maxScore);
        setScorePct(result.scorePct);
        setDurationUsed(result.durationUsedSeconds);
        setAutoSubmitted(result.autoSubmitted);
        setPhase("results");

        // Clean up autosave
        try {
          localStorage.removeItem(AUTOSAVE_KEY_PREFIX + attemptId);
        } catch { /* ignore */ }
      } catch (err) {
        console.error("Submit failed:", err);
        // Go back to exam so user can retry
        setPhase("exam");
      }
    },
    [attemptId, answers, slots, submitExam]
  );

  // ─── Exit ───
  const handleExit = useCallback(async () => {
    if (gracePeriodActive && attemptId) {
      try {
        await abandonExam(attemptId);
      } catch { /* ignore */ }
    }
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    onClose();
  }, [gracePeriodActive, attemptId, abandonExam, onClose]);

  // ─── Timer callbacks ───
  const onWarning5 = useCallback(() => {
    setWarningBanner(t("exam.timer_warning_5"));
    setTimeout(() => setWarningBanner(null), 5000);
  }, [t]);

  const onWarning1 = useCallback(() => {
    setWarningBanner(t("exam.timer_warning_1"));
  }, [t]);

  const onTimerExpired = useCallback(() => {
    setWarningBanner(t("exam.timer_expired"));
    doSubmit(true);
  }, [doSubmit, t]);

  // ─── Keyboard ───
  useEffect(() => {
    if (phase !== "exam") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        setShowExit(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  // ─── beforeunload ───
  useEffect(() => {
    if (phase !== "exam") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ─── Cleanup on unmount ───
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, []);

  // ─── RENDER ───

  if (phase === "briefing") {
    return (
      <ExamBriefing
        exam={exam}
        examLanguage={examLanguage}
        onLanguageChange={setExamLanguage}
        onStart={handleStartExam}
        onBack={onClose}
        attemptNumber={(quota?.used ?? 0) + 1}
        maxAttempts={quota?.max ?? 3}
      />
    );
  }

  if (phase === "grading") {
    return <ExamGradingLoader />;
  }

  if (phase === "results" && gradingResults) {
    return (
      <ExamResults
        exam={exam}
        gradingResults={gradingResults}
        totalScore={totalScore}
        maxScore={maxScore}
        scorePct={scorePct}
        durationUsedSeconds={durationUsed}
        autoSubmitted={autoSubmitted}
        userAnswers={answers}
        examLanguage={examLanguage}
        onClose={onClose}
        onRetry={() => {
          // Reset state for a new attempt
          setPhase("briefing");
          setAttemptId(null);
          setStartedAt(null);
          setAnswers({});
          setCurrentIndex(0);
          setGradingResults(null);
          setTotalScore(0);
          setScorePct(0);
          setDurationUsed(null);
          setAutoSubmitted(false);
        }}
      />
    );
  }

  // ─── Phase: Exam ───
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="truncate text-sm font-bold text-foreground">
            {exam.meta.courseName}
          </span>
          {/* Grace period chip */}
          {gracePeriodActive && startedAt && (
            <GraceChip startedAt={startedAt} t={t} />
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          {startedAt && (
            <ExamTimer
              durationMinutes={exam.meta.durationMinutes}
              startedAt={startedAt}
              onWarning5={onWarning5}
              onWarning1={onWarning1}
              onExpired={onTimerExpired}
            />
          )}

          {/* Language toggle */}
          <button
            type="button"
            onClick={() =>
              setExamLanguage((l) => (l === "en" ? "id" : "en"))
            }
            className="hs-press flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Languages className="h-3.5 w-3.5" />
            {examLanguage.toUpperCase()}
          </button>

          {/* Exit */}
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className="hs-press flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Exit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <AnimatePresence>
        {warningBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
          >
            <p className="px-4 py-2 text-center text-sm font-semibold text-amber-700 dark:text-amber-400">
              ⚠️ {warningBanner}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Nav panel (desktop sidebar + mobile FAB) */}
        <ExamNavPanel
          slots={slots}
          currentIndex={currentIndex}
          answers={answers}
          onJump={jumpTo}
        />

        {/* Question area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-6"
        >
          <div className="mx-auto max-w-2xl">
            {currentQuestion && (
              <ExamQuestionView
                question={currentQuestion}
                examLanguage={examLanguage}
                answers={answers}
                onAnswerChange={handleAnswerChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border bg-card/80 px-4 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="hs-press flex h-11 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("exam.prev")}
          </button>

          <div className="flex-1 text-center text-xs text-muted-foreground">
            {answeredCount}/{slots.length} {t("exam.progress")}
          </div>

          {currentIndex < slots.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="hs-press flex h-11 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium text-muted-foreground"
            >
              {t("exam.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="hs-press flex h-11 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm"
            >
              <Send className="h-4 w-4" />
              {t("exam.submit_all")}
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showExit && (
          <ExamExitModal
            open
            gracePeriodActive={gracePeriodActive}
            remaining={quota?.remaining ?? 0}
            onContinue={() => setShowExit(false)}
            onExit={handleExit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubmit && (
          <ExamSubmitModal
            open
            answered={answeredCount}
            total={slots.length}
            onSubmit={() => doSubmit(false)}
            onBack={() => setShowSubmit(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Compact chip showing grace period countdown (sits inside header). */
function GraceChip({
  startedAt,
  t,
}: {
  startedAt: string;
  t: (key: string) => string;
}) {
  const [left, setLeft] = useState(GRACE_PERIOD_S);

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const remaining = Math.max(0, GRACE_PERIOD_S - elapsed);
      setLeft(Math.ceil(remaining));
    }, 250);
    return () => clearInterval(tick);
  }, [startedAt]);

  if (left <= 0) return null;

  return (
    <span className="shrink-0 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
      {t("exam.grace_period_short").replace("{s}", String(left))}
    </span>
  );
}

