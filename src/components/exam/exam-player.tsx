"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Languages,
  Pen,
  BookMarked,
  Calculator,
  AlertTriangle,
} from "lucide-react";
import type {
  ExamData,
  ExamQuestion,
  ExamAnswerSlot,
  UserExamAnswer,
  ExamGradingResult,
} from "@/types/exam";
import { ExamBriefing } from "./exam-briefing";
import { ExamTimer } from "./exam-timer";
import { ExamNavPanel } from "./exam-nav-panel";
import { ExamQuestionView } from "./exam-question-view";
import { ExamExitModal } from "./exam-exit-modal";
import { ExamSubmitModal } from "./exam-submit-modal";
import { ExamGradingLoader } from "./exam-grading-loader";
import { ExamResults } from "./exam-results";
import { ExamScratchpad, SCRATCH_KEY_PREFIX } from "./exam-scratchpad";
import { ExamCheatSheet } from "./exam-cheatsheet";
import { ExamCalculator } from "./exam-calculator";
import { useExam } from "@/hooks/use-exam";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface Props {
  exam: ExamData;
  subjectId: string;
  onClose: () => void;
}

const GRACE_PERIOD_S = 30;
const SESSION_KEY_PREFIX = "hs-exam-session-";

type SlotStatus = "empty" | "partial" | "answered";

/** Build one navigable slot per top-level question. */
function buildSlots(exam: ExamData, lang: "en" | "id"): ExamAnswerSlot[] {
  return exam.questions.map((q, i) => ({
    questionId: q.id,
    label: String(i + 1),
    points: q.points,
    sectionType: q.type,
    section: q.sectionLabel[lang].split("(")[0].trim(),
  }));
}

/** Answered status of a slot, honouring T/F groups and multi-part sub-boxes. */
function slotStatus(
  q: ExamQuestion,
  answers: Record<string, string>,
  tf: Record<string, "true" | "false">
): SlotStatus {
  // No minimum-length gate: a unit counts as answered the moment it has any
  // non-empty content (T/F also needs a verdict). Partial = some parts filled.
  if (q.type === "true-false") {
    const subs = q.subQuestions ?? [];
    const done = subs.filter(
      (s) => tf[s.id] && (answers[s.id] ?? "").trim().length > 0
    ).length;
    if (done === 0) return "empty";
    return done === subs.length ? "answered" : "partial";
  }
  if (q.subQuestions && q.subQuestions.length > 0) {
    const subs = q.subQuestions;
    const filled = subs.filter(
      (s) => (answers[s.id] ?? "").trim().length > 0
    ).length;
    if (filled === 0) return "empty";
    return filled === subs.length ? "answered" : "partial";
  }
  const a = (answers[q.id] ?? "").trim();
  return a.length === 0 ? "empty" : "answered";
}

interface ResumeSession {
  attemptId: string;
  startedAt: string;
  examLanguage: "en" | "id";
  answers: Record<string, string>;
  tfChoice: Record<string, "true" | "false">;
}

/**
 * Read a saved in-progress session (refresh/crash safety net). The player only
 * mounts client-side (behind the latihan page's examDataLoaded gate), so this
 * runs in the browser where localStorage is available.
 */
function readSession(subjectId: string): ResumeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY_PREFIX + subjectId);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.attemptId !== "string" || typeof s.startedAt !== "string") {
      return null;
    }
    return {
      attemptId: s.attemptId,
      startedAt: s.startedAt,
      examLanguage: s.examLanguage === "en" ? "en" : "id",
      answers: s.answers ?? {},
      tfChoice: s.tfChoice ?? {},
    };
  } catch {
    return null;
  }
}

/** Dev-only: `?examMins=1` shortens the timer so expiry/auto-submit is testable. */
function examDurationMinutes(fallback: number): number {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const m = Number(new URLSearchParams(window.location.search).get("examMins"));
    if (m > 0) return m;
  }
  return fallback;
}

type Phase = "briefing" | "exam" | "grading" | "results";

export function ExamPlayer({ exam, subjectId, onClose }: Props) {
  const { t } = useTranslation();
  const { startExam, abandonExam, submitExam, regradeAttempt, quota } = useExam(subjectId);

  // Resume an in-progress session (read once, client-side) so an accidental
  // refresh / auto-refresh drops the user right back into their attempt.
  const [resumed] = useState(() => readSession(subjectId));
  const [phase, setPhase] = useState<Phase>(resumed ? "exam" : "briefing");
  const [examLanguage, setExamLanguage] = useState<"en" | "id">(resumed?.examLanguage ?? "id");
  const [attemptId, setAttemptId] = useState<string | null>(resumed?.attemptId ?? null);
  const [startedAt, setStartedAt] = useState<string | null>(resumed?.startedAt ?? null);
  const [answers, setAnswers] = useState<Record<string, string>>(resumed?.answers ?? {});
  const [tfChoice, setTfChoice] = useState<Record<string, "true" | "false">>(resumed?.tfChoice ?? {});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showExit, setShowExit] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  // Floating-tool stacking: the last-focused/opened tool renders on top (#8).
  const [zStack, setZStack] = useState<string[]>([]);
  const bringToFront = useCallback(
    (id: string) => setZStack((s) => [...s.filter((x) => x !== id), id]),
    []
  );
  const zOf = (id: string) => 110 + Math.max(0, zStack.indexOf(id));
  const [scratchLayout, setScratchLayout] = useState<{
    mode: string;
    isMobile: boolean;
    dockW: number;
    dockH: number;
  } | null>(null);
  const [gracePeriodActive, setGracePeriodActive] = useState(!resumed);
  const [gradingResults, setGradingResults] = useState<ExamGradingResult[] | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string>>({});
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(exam.meta.totalScore);
  const [scorePct, setScorePct] = useState(0);
  const [durationUsed, setDurationUsed] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState(false);

  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards against re-entrant / duplicate submits (the timer-expiry loop).
  const submittingRef = useRef(false);
  // Per-subject session key for the refresh/crash resume safety net.
  const sessionKey = SESSION_KEY_PREFIX + subjectId;
  // Anti-exploit audit: count times the user left the exam tab (visibilitychange
  // = tab switch / minimize; a refresh unmounts so it is NOT counted here). The
  // wall-clock timer keeps running regardless, so leaving never helps.
  const awayCountRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);

  const slots = buildSlots(exam, examLanguage);
  const currentSlot = slots[currentIndex];
  const currentQuestion = currentSlot
    ? exam.questions.find((q) => q.id === currentSlot.questionId) ?? null
    : null;

  const statuses: SlotStatus[] = exam.questions.map((q) =>
    slotStatus(q, answers, tfChoice)
  );
  const answeredCount = statuses.filter((s) => s === "answered").length;

  // ─── Phase: Briefing → Exam ───
  const handleStartExam = useCallback(async () => {
    try {
      const result = await startExam(exam.meta.examId, examLanguage);
      setAttemptId(result.attemptId);
      setStartedAt(result.startedAt);
      setPhase("exam");
      setGracePeriodActive(true);

      graceTimerRef.current = setTimeout(() => {
        setGracePeriodActive(false);
      }, GRACE_PERIOD_S * 1000);

      // Persist the session immediately so an accidental refresh right after
      // starting can resume THIS attempt (no quota wasted, no answers lost).
      try {
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            attemptId: result.attemptId,
            startedAt: result.startedAt,
            examLanguage,
            answers: {},
            tfChoice: {},
          })
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error("Failed to start exam:", err);
    }
  }, [exam.meta.examId, examLanguage, startExam, sessionKey]);

  // ─── Autosave full session (for resume after refresh/crash) ───
  useEffect(() => {
    if (phase !== "exam" || !attemptId || !startedAt) return;
    autosaveRef.current = setInterval(() => {
      try {
        localStorage.setItem(
          sessionKey,
          JSON.stringify({ attemptId, startedAt, examLanguage, answers, tfChoice })
        );
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [phase, attemptId, startedAt, examLanguage, answers, tfChoice, sessionKey]);

  // ─── Answer change ───
  const handleAnswerChange = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleTfChoice = useCallback(
    (subId: string, value: "true" | "false") => {
      setTfChoice((prev) => ({ ...prev, [subId]: value }));
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

  // ─── Clear all autosaved data for this attempt ───
  const clearAutosave = useCallback(() => {
    try {
      localStorage.removeItem(sessionKey);
      if (attemptId) localStorage.removeItem(SCRATCH_KEY_PREFIX + attemptId);
    } catch {
      /* ignore */
    }
  }, [attemptId, sessionKey]);

  // ─── Submit ───
  const doSubmit = useCallback(
    async (auto = false) => {
      // Ignore duplicate/concurrent submits (kills the timer-expiry loop).
      if (!attemptId || submittingRef.current) return;
      submittingRef.current = true;
      setShowSubmit(false);
      setShowScratchpad(false);
      setShowCheatSheet(false);
      setShowCalculator(false);
      setSubmitError(false);
      setPhase("grading");

      // Expand every answerable unit (essay, sub-question, or T/F statement).
      const userAnswers: UserExamAnswer[] = [];
      const composed: Record<string, string> = {};
      const now = new Date().toISOString();
      for (const q of exam.questions) {
        if (q.type === "true-false") {
          for (const sub of q.subQuestions ?? []) {
            const verdict = tfChoice[sub.id];
            const reason = answers[sub.id] ?? "";
            const vlabel =
              verdict === "true"
                ? "True"
                : verdict === "false"
                  ? "False"
                  : "(tidak dipilih)";
            const ans = `${vlabel}. Alasan: ${reason}`.trim();
            userAnswers.push({ questionId: sub.id, answer: ans, answeredAt: now });
            composed[sub.id] = ans;
          }
        } else if (q.subQuestions && q.subQuestions.length > 0) {
          for (const sub of q.subQuestions) {
            const ans = answers[sub.id] ?? "";
            userAnswers.push({ questionId: sub.id, answer: ans, answeredAt: now });
            composed[sub.id] = ans;
          }
        } else {
          const ans = answers[q.id] ?? "";
          userAnswers.push({ questionId: q.id, answer: ans, answeredAt: now });
          composed[q.id] = ans;
        }
      }
      setSubmittedAnswers(composed);

      // Submit with a couple of retries (network/timeout resilience). The
      // server now always grades from the in-repo keys, so this only guards
      // against transient transport failures.
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await submitExam(attemptId, userAnswers, auto);
          setGradingResults(result.gradingResults);
          setTotalScore(result.totalScore);
          setMaxScore(result.maxScore);
          setScorePct(result.scorePct);
          setDurationUsed(result.durationUsedSeconds);
          setAutoSubmitted(result.autoSubmitted);
          setPhase("results");
          clearAutosave();
          submittingRef.current = false;
          return;
        } catch (err) {
          lastErr = err;
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      console.error("Submit failed after retries:", lastErr);
      submittingRef.current = false;
      // Auto-submit (time up): do NOT return to the exam phase — the timer
      // would remount, re-fire onExpired, and loop. Show a recoverable error
      // instead (answers stay in localStorage). Manual submit can return.
      if (auto) {
        setSubmitError(true);
      } else {
        setPhase("exam");
      }
    },
    [attemptId, answers, tfChoice, exam.questions, submitExam, clearAutosave]
  );

  // Manual retry from the error screen (re-runs an auto-style submit).
  const retrySubmit = useCallback(() => {
    setSubmitError(false);
    void doSubmit(true);
  }, [doSubmit]);

  // Re-grade from the results screen (re-runs AI grading on saved answers).
  // Stays on the results phase (no flip to the full-screen grading loader) so
  // the results screen can show its own inline spinner + a success toast; the
  // score props update in place. Rejects so the results screen can flag errors.
  const handleResultsRegrade = useCallback(async () => {
    if (!attemptId || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const r = await regradeAttempt(attemptId);
      setGradingResults(r.gradingResults);
      setTotalScore(r.totalScore);
      setMaxScore(r.maxScore);
      setScorePct(r.scorePct);
    } catch (e) {
      console.error("Regrade failed:", e);
      throw e;
    } finally {
      submittingRef.current = false;
    }
  }, [attemptId, regradeAttempt]);

  // ─── Exit ───
  const handleExit = useCallback(async () => {
    if (gracePeriodActive && attemptId) {
      try {
        await abandonExam(attemptId);
      } catch {
        /* ignore */
      }
    }
    if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    clearAutosave();
    onClose();
  }, [gracePeriodActive, attemptId, abandonExam, onClose, clearAutosave]);

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
      // Escape is owned by the exam player even while a textarea is focused, so
      // it closes the top tool / toggles the exit modal instead of bubbling to
      // the app-shell's global "Esc -> dashboard" handler (which now also skips
      // this route). stopPropagation is a belt-and-suspenders guard.
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (showCheatSheet) setShowCheatSheet(false);
        else if (showCalculator) setShowCalculator(false);
        else if (showScratchpad) setShowScratchpad(false);
        else setShowExit((v) => !v);
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [phase, showCheatSheet, showScratchpad, showCalculator]);

  // ─── beforeunload ───
  useEffect(() => {
    if (phase !== "exam") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // ─── Track tab-away (anti-exploit audit) ───
  useEffect(() => {
    if (phase !== "exam") return;
    const onVis = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else if (hiddenAtRef.current != null) {
        const elapsed = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (elapsed > 1500) awayCountRef.current += 1; // ignore sub-1.5s blips
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [phase]);

  // ─── Trap browser Back during the exam ───
  // Push a sentinel history entry; a back press fires popstate, where we
  // re-push and open the exit-confirm modal instead of leaving the exam.
  useEffect(() => {
    if (phase !== "exam") return;
    window.history.pushState({ hsExam: true }, "");
    const onPop = () => {
      window.history.pushState({ hsExam: true }, "");
      setShowExit(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
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
    if (submitError) {
      return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background px-6">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {t("exam.submit_error_title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("exam.submit_error_desc")}
            </p>
            <button
              type="button"
              onClick={retrySubmit}
              className="hs-press mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
            >
              {t("exam.submit_retry")}
            </button>
          </div>
        </div>
      );
    }
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
        userAnswers={submittedAnswers}
        examLanguage={examLanguage}
        onClose={onClose}
        onRetry={() => {
          setPhase("briefing");
          setAttemptId(null);
          setStartedAt(null);
          setAnswers({});
          setTfChoice({});
          setSubmittedAnswers({});
          setCurrentIndex(0);
          setGradingResults(null);
          setTotalScore(0);
          setScorePct(0);
          setDurationUsed(null);
          setAutoSubmitted(false);
          setSubmitError(false);
        }}
        onRegrade={handleResultsRegrade}
        awayCount={awayCountRef.current}
      />
    );
  }

  // ─── Phase: Exam ───
  // Tool buttons rendered both inline (desktop) and in a slim row (mobile), so
  // every tool stays 1-click while the course name stays full and uncramped.
  const toolButtons = (
    <>
      <button
        type="button"
        onClick={() => { setShowScratchpad((v) => !v); bringToFront("scratch"); }}
        title={t("exam.scratchpad_open")}
        aria-label={t("exam.scratchpad_open")}
        aria-pressed={showScratchpad}
        className={`hs-press flex h-8 w-8 items-center justify-center rounded-lg border ${showScratchpad ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
      >
        <Pen className="h-4 w-4" />
      </button>
      {exam.calculator && (
        <button
          type="button"
          onClick={() => { setShowCalculator((v) => !v); bringToFront("calc"); }}
          title={t("exam.calculator_open")}
          aria-label={t("exam.calculator_open")}
          aria-pressed={showCalculator}
          className={`hs-press flex h-8 w-8 items-center justify-center rounded-lg border ${showCalculator ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
        >
          <Calculator className="h-4 w-4" />
        </button>
      )}
      {exam.cheatSheet && (
        <button
          type="button"
          onClick={() => { setShowCheatSheet((v) => !v); bringToFront("cheat"); }}
          title={t("exam.cheatsheet_open")}
          aria-label={t("exam.cheatsheet_open")}
          aria-pressed={showCheatSheet}
          className={`hs-press flex h-8 w-8 items-center justify-center rounded-lg border ${showCheatSheet ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
        >
          <BookMarked className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setExamLanguage((l) => (l === "en" ? "id" : "en"))}
        className="hs-press flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <Languages className="h-3.5 w-3.5" />
        {examLanguage.toUpperCase()}
      </button>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] flex flex-col overscroll-none bg-background"
      style={{
        // Shift the whole exam left when the scratchpad is docked (desktop) so
        // the question stays fully visible beside it.
        paddingRight:
          showScratchpad &&
          scratchLayout?.mode === "dock" &&
          !scratchLayout.isMobile
            ? scratchLayout.dockW
            : undefined,
        transition: "padding-right 0.2s ease",
      }}
    >
      {/* Header — title row (course name stays full) + a slim tool row on
          mobile so every tool is 1-click without cramping the title. */}
      <div className="border-b border-border bg-card/80 px-3 py-2 backdrop-blur-sm sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {exam.meta.courseName}
            </span>
            {gracePeriodActive && startedAt && (
              <GraceChip startedAt={startedAt} t={t} />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {startedAt && (
              <ExamTimer
                durationMinutes={examDurationMinutes(exam.meta.durationMinutes)}
                startedAt={startedAt}
                onWarning5={onWarning5}
                onWarning1={onWarning1}
                onExpired={onTimerExpired}
              />
            )}
            {/* Tools inline on desktop */}
            <div className="hidden items-center gap-2 sm:flex">{toolButtons}</div>
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

        {/* Tool row — mobile only */}
        <div className="mt-2 flex items-center gap-2 sm:hidden">{toolButtons}</div>
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
        <ExamNavPanel
          slots={slots}
          statuses={statuses}
          currentIndex={currentIndex}
          onJump={jumpTo}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-5 sm:py-6"
        >
          <div className="mx-auto max-w-2xl">
            {currentQuestion && (
              <ExamQuestionView
                question={currentQuestion}
                examLanguage={examLanguage}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                tfChoice={tfChoice}
                onTfChoice={handleTfChoice}
                lockCopy
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

      {/* Overlays */}
      <AnimatePresence>
        {showScratchpad && (
          <ExamScratchpad
            attemptId={attemptId}
            onClose={() => setShowScratchpad(false)}
            onLayout={setScratchLayout}
            zIndex={zOf("scratch")}
            onFocus={() => bringToFront("scratch")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheatSheet && exam.cheatSheet && (
          <ExamCheatSheet
            cheatSheet={exam.cheatSheet}
            onClose={() => setShowCheatSheet(false)}
            zIndex={zOf("cheat")}
            onFocus={() => bringToFront("cheat")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalculator && exam.calculator && (
          <ExamCalculator
            onClose={() => setShowCalculator(false)}
            zIndex={zOf("calc")}
            onFocus={() => bringToFront("calc")}
          />
        )}
      </AnimatePresence>

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
