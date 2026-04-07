"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Timer,
  Trophy,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { calculateQuizScore, type QuizResult } from "@/lib/quiz-scoring";
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

interface QuizTabProps {
  questions: QuizQuestion[];
  onScoreSave?: (score: number, total: number) => void;
  subjectId?: string;
}

type QuizState = "idle" | "playing" | "review";

export function QuizTab({ questions, onScoreSave, subjectId }: QuizTabProps) {
  const [state, setState] = useState<QuizState>("idle");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timer, setTimer] = useState(QUIZ_TIMER_SECONDS);
  const [result, setResult] = useState<QuizResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const current = questions[currentIdx];
  const total = questions.length;

  // Timer countdown
  useEffect(() => {
    if (state !== "playing") return;

    setTimer(QUIZ_TIMER_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          // Time's up - auto advance
          handleNext();
          return QUIZ_TIMER_SECONDS;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, currentIdx]);

  const start = useCallback(() => {
    sounds.toggle();
    setAnswers({});
    setCurrentIdx(0);
    setResult(null);
    setState("playing");
  }, []);

  const selectAnswer = useCallback(
    (optionIdx: number) => {
      if (state !== "playing") return;
      if (answers[current.id] !== undefined) return; // Already answered

      if (optionIdx === current.answer) {
        sounds.correct();
      } else {
        sounds.wrong();
      }
      setAnswers((prev) => ({ ...prev, [current.id]: optionIdx }));
      // Scroll parent <main> to bottom after animation renders explanation + Next button
      setTimeout(() => {
        const main = document.querySelector("main");
        if (main) main.scrollTo({ top: main.scrollHeight, behavior: "smooth" });
      }, 500);
    },
    [state, current, answers]
  );

  const handleNext = useCallback(() => {
    sounds.click();
    if (currentIdx < total - 1) {
      setCurrentIdx((i) => i + 1);
      setTimer(QUIZ_TIMER_SECONDS);
    } else {
      // Quiz finished
      if (timerRef.current) clearInterval(timerRef.current);
      const quizResult = calculateQuizScore(questions, answers);
      setResult(quizResult);
      setState("review");
      onScoreSave?.(quizResult.totalScore, quizResult.maxScore);
    }
  }, [currentIdx, total, questions, answers, onScoreSave]);

  if (questions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Quiz belum tersedia untuk mata kuliah ini.
      </p>
    );
  }

  // Idle state
  if (state === "idle") {
    return (
      <motion.div
        className="flex flex-col items-center gap-4 py-8"
        variants={scaleIn}
        initial="hidden"
        animate="visible"
      >
        {subjectId === "cbkwn" && (
          <div className="flex items-start gap-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 w-full max-w-md">
            <Monitor className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Ujian mata kuliah ini dilaksanakan secara <span className="font-semibold">online</span>. Silakan kunjungi{" "}
              <a href="https://exam.apps.binus.ac.id" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">exam.apps.binus.ac.id</a>{" "}
              untuk informasi lebih lanjut.
            </p>
          </div>
        )}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Play className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="font-heading text-lg font-semibold">Quiz Time!</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} pertanyaan &middot; {QUIZ_TIMER_SECONDS}s per soal &middot;
            Max 100 poin
          </p>
        </div>
        <motion.div whileHover={hoverLift} whileTap={tapScale}>
          <Button onClick={start}>Mulai Quiz</Button>
        </motion.div>
      </motion.div>
    );
  }

  // Review state
  if (state === "review" && result) {
    return (
      <motion.div
        className="flex flex-col gap-4 py-4"
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
      >
        {/* Score summary */}
        <motion.div
          className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center"
          variants={staggerItem}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
          >
            <Trophy className="h-10 w-10 text-primary" />
          </motion.div>
          <div>
            <p className="font-heading text-3xl font-bold tabular-nums">
              {result.totalScore}
              <span className="text-lg text-muted-foreground">
                /{result.maxScore}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {result.percentage}% benar
            </p>
          </div>

          {/* Category breakdown */}
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

        {/* Question review */}
        <div className="flex flex-col gap-2">
          {questions.map((q) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.answer;
            const wasSkipped = userAnswer === undefined;

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
                  ) : isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{parseInline(q.question)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Jawaban: {parseInline(q.options[q.answer])}
                      {!wasSkipped && !isCorrect && (
                        <span className="text-destructive">
                          {" "}
                          &middot; Kamu pilih: {parseInline(q.options[userAnswer])}
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
            <Button onClick={start} variant="outline">
              <RotateCcw className="h-4 w-4 mr-1" />
              Coba Lagi
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Playing state
  const selectedAnswer = answers[current.id];
  const hasAnswered = selectedAnswer !== undefined;
  const timerPercent = (timer / QUIZ_TIMER_SECONDS) * 100;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {currentIdx + 1}/{total}
        </span>
        <div className="flex items-center gap-2">
          <Timer
            className={`h-4 w-4 ${timer <= 5 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}
          />
          <span
            className={`text-sm font-mono tabular-nums ${timer <= 5 ? "text-destructive font-bold" : ""}`}
          >
            {timer}s
          </span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 linear ${
            timer <= 5 ? "bg-destructive" : "bg-primary"
          }`}
          style={{ width: `${timerPercent}%` }}
        />
      </div>

      {/* Question - animated between questions */}
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

      {/* Options */}
      <div className="flex flex-col gap-2">
        {current.options.map((option, idx) => {
          const isSelected = selectedAnswer === idx;
          const isCorrect = hasAnswered && idx === current.answer;
          const isWrong = hasAnswered && isSelected && !isCorrect;

          return (
            <motion.button
              key={idx}
              onClick={() => selectAnswer(idx)}
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
              animate={
                isCorrect
                  ? popScale
                  : isWrong
                    ? shakeX
                    : {}
              }
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

      {/* Explanation + Next button */}
      <AnimatePresence>
        {hasAnswered && current.explanation && (
          <motion.div
            className="rounded-xl border border-border bg-muted/50 p-4"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Penjelasan</p>
            <p className="text-sm leading-relaxed">{parseInline(current.explanation)}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next button */}
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
