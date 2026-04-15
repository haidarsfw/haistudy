"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Timer,
  TimerOff,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { QUIZ_TIMER_SECONDS } from "@/lib/constants";
import {
  springSmooth,
  scaleIn,
  fadeInUp,
  staggerContainer,
  staggerItem,
  tapScale,
  hoverLift,
  shakeX,
  popScale,
} from "@/lib/motion";
import { sounds } from "@/lib/sounds";
import { useQuiz, type QuizSettings, TIMED_OUT_ANSWER } from "@/hooks/use-quiz";
import { QuizSettingsScreen } from "@/components/subject/quiz-settings";

interface QuizTabProps {
  questions: QuizQuestion[];
  onScoreSave?: (score: number, total: number) => void;
  subjectId?: string;
}

const QUIZ_PREFS_KEY = "hs-quiz-prefs";

interface QuizPreferences {
  lastModuleFilter: Record<string, string | null>;
  defaultShuffled: boolean;
  defaultTimerEnabled: boolean;
}

function loadQuizPrefs(): QuizPreferences {
  const defaults: QuizPreferences = {
    lastModuleFilter: {},
    defaultShuffled: false,
    defaultTimerEnabled: true,
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(QUIZ_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<QuizPreferences>;
    return {
      lastModuleFilter: parsed.lastModuleFilter ?? {},
      defaultShuffled: parsed.defaultShuffled ?? false,
      defaultTimerEnabled: parsed.defaultTimerEnabled ?? true,
    };
  } catch {
    return defaults;
  }
}

function saveQuizPrefs(prefs: QuizPreferences) {
  try {
    localStorage.setItem(QUIZ_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function QuizTab({ questions, onScoreSave, subjectId }: QuizTabProps) {
  const {
    phase,
    settings,
    filteredQuestions,
    currentIdx,
    answers,
    timer,
    timerRunning,
    result,
    start,
    selectAnswer,
    nextOrFinish,
    resetToSettings,
  } = useQuiz({ questions, onFinish: onScoreSave });

  const handleStart = useCallback(
    (s: QuizSettings) => {
      start(s);
      const current = loadQuizPrefs();
      const nextPrefs: QuizPreferences = {
        lastModuleFilter: subjectId
          ? { ...current.lastModuleFilter, [subjectId]: s.moduleFilter }
          : current.lastModuleFilter,
        defaultShuffled: s.shuffled,
        defaultTimerEnabled: s.timerEnabled,
      };
      saveQuizPrefs(nextPrefs);
    },
    [start, subjectId]
  );

  const handleSelectAnswer = useCallback(
    (optionIdx: number) => {
      const current = filteredQuestions[currentIdx];
      if (!current) return;
      if (answers[current.id] !== undefined) return;
      if (optionIdx === current.answer) sounds.correct();
      else sounds.wrong();
      selectAnswer(optionIdx);
      // Scroll parent <main> after explanation renders
      setTimeout(() => {
        const main = document.querySelector("main");
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
      }, 500);
    },
    [filteredQuestions, currentIdx, answers, selectAnswer]
  );

  const handleNext = useCallback(() => {
    sounds.click();
    nextOrFinish();
  }, [nextOrFinish]);

  // Fire the wrong-sound exactly once when the current question flips to
  // timed-out. Defined at top-level to satisfy rules-of-hooks across the
  // component's conditional early returns below.
  const lastTimeoutQidRef = useRef<number | null>(null);
  const playingCurrent =
    phase === "playing" ? filteredQuestions[currentIdx] : undefined;
  const playingTimedOut =
    !!playingCurrent && answers[playingCurrent.id] === TIMED_OUT_ANSWER;
  useEffect(() => {
    if (!playingCurrent || !playingTimedOut) return;
    if (lastTimeoutQidRef.current === playingCurrent.id) return;
    lastTimeoutQidRef.current = playingCurrent.id;
    sounds.wrong();
  }, [playingCurrent, playingTimedOut]);

  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Quiz belum tersedia untuk mata kuliah ini.
      </p>
    );
  }

  if (phase === "settings") {
    return (
      <QuizSettingsScreen
        questions={questions}
        subjectId={subjectId}
        onStart={handleStart}
      />
    );
  }

  if (phase === "review" && result) {
    const scopeLabel = settings.moduleFilter ?? "Semua Modul";
    return (
      <motion.div
        className="flex flex-col gap-4 py-4"
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
          variants={staggerItem}
        >
          <motion.div variants={scaleIn} initial="hidden" animate="visible">
            <Trophy className="h-10 w-10 text-primary" />
          </motion.div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Hasil · {scopeLabel}
            </p>
            <p className="font-heading text-3xl font-bold tabular-nums mt-1">
              {result.totalScore}
              <span className="text-lg text-muted-foreground">
                /{result.maxScore}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {result.percentage}% benar
            </p>
          </div>

          <motion.div
            className="w-full mt-3 flex flex-col gap-1"
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
          >
            {result.categories.map((cat) => (
              <motion.div
                key={cat.category}
                className="flex items-center justify-between text-xs"
                variants={staggerItem}
              >
                <span className="text-muted-foreground">{cat.category}</span>
                <span className="tabular-nums">
                  {cat.correct}/{cat.total} ({Math.round(cat.score)} pts)
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div className="flex flex-col gap-2">
          {filteredQuestions.map((q) => {
            const userAnswer = answers[q.id];
            const wasSkipped = userAnswer === undefined;
            const wasTimedOut = userAnswer === TIMED_OUT_ANSWER;
            const isCorrect = !wasSkipped && !wasTimedOut && userAnswer === q.answer;

            return (
              <div
                key={q.id}
                className={`rounded-xl border p-3 ${
                  wasSkipped
                    ? "border-border bg-muted/50"
                    : isCorrect
                      ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {wasSkipped ? (
                    <Timer className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  ) : wasTimedOut ? (
                    <TimerOff className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  ) : isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {parseInline(q.question)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jawaban: {parseInline(q.options[q.answer])}
                      {wasTimedOut && (
                        <span className="text-destructive">
                          {" "}
                          &middot; Waktu habis (0 poin)
                        </span>
                      )}
                      {!wasSkipped && !wasTimedOut && !isCorrect && (
                        <span className="text-destructive">
                          {" "}
                          &middot; Kamu pilih:{" "}
                          {parseInline(q.options[userAnswer])}
                        </span>
                      )}
                    </p>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {parseInline(q.explanation)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <motion.div variants={staggerItem} className="self-center">
          <motion.div whileHover={hoverLift} whileTap={tapScale}>
            <Button onClick={resetToSettings} variant="outline">
              <RotateCcw className="h-4 w-4 mr-1" />
              Coba Lagi
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Playing phase
  const current = filteredQuestions[currentIdx];
  if (!current) return null;

  const total = filteredQuestions.length;
  const selectedAnswer = answers[current.id];
  const hasAnswered = selectedAnswer !== undefined;
  const didTimeOut = selectedAnswer === TIMED_OUT_ANSWER;
  const timerPercent = (timer / QUIZ_TIMER_SECONDS) * 100;
  const showTimer = settings.timerEnabled;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIdx + 1}/{total}
        </span>
        {showTimer && (
          <div className="flex items-center gap-2">
            <Timer
              className={`h-4 w-4 transition-opacity ${
                timer <= 5 && timerRunning
                  ? "text-destructive animate-pulse"
                  : "text-muted-foreground"
              } ${!timerRunning ? "opacity-50" : ""}`}
            />
            <span
              className={`text-sm font-mono tabular-nums transition-opacity ${
                timer <= 5 && timerRunning
                  ? "text-destructive font-bold"
                  : ""
              } ${!timerRunning ? "opacity-50" : ""}`}
              aria-live="polite"
            >
              {timer}s
            </span>
          </div>
        )}
      </div>

      {showTimer && (
        <div className="h-1 w-full rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-1000 linear ${
              timer <= 5 ? "bg-destructive" : "bg-primary"
            } ${!timerRunning ? "opacity-40" : ""}`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          className="rounded-xl border border-border bg-card p-5"
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {current.category}
          </p>
          <p className="font-heading text-base font-semibold">
            {parseInline(current.question)}
          </p>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {didTimeOut && (
          <motion.div
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <TimerOff className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Waktu habis
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jawaban ditandai salah (0 poin). Jawaban yang benar disorot di
                bawah.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2">
        {current.options.map((option, idx) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect = hasAnswered && idx === current.answer;
          const isWrong = hasAnswered && isSelected && !isCorrect;

          return (
            <motion.button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              disabled={hasAnswered}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left text-sm transition-colors ${
                isCorrect
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                  : isWrong
                    ? "border-destructive bg-destructive/5"
                    : isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/30"
              }`}
              animate={isCorrect ? popScale : isWrong ? shakeX : {}}
              transition={springSmooth}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isWrong
                      ? "border-destructive bg-destructive text-white"
                      : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                }`}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="flex-1">{parseInline(option)}</span>
              {isCorrect && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              )}
              {isWrong && <XCircle className="h-4 w-4 text-destructive" />}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {hasAnswered && current.explanation && (
          <motion.div
            className="rounded-xl border border-border bg-muted/50 p-4"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Penjelasan
            </p>
            <p className="text-sm leading-relaxed">
              {parseInline(current.explanation)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasAnswered && (
          <motion.div
            className="self-end mt-4"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Button onClick={handleNext}>
              {currentIdx < total - 1 ? "Selanjutnya" : "Lihat Hasil"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
