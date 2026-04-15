"use client";

import { useReducer, useEffect, useCallback, useRef } from "react";
import type { QuizQuestion } from "@/types";
import { calculateQuizScore, type QuizResult } from "@/lib/quiz-scoring";
import { QUIZ_TIMER_SECONDS } from "@/lib/constants";

export type QuizPhase = "settings" | "playing" | "review";

// Sentinel stored in `answers[qid]` when the timer runs out before the user
// picks an option. Distinct from undefined (skipped/unseen) and from valid
// option indexes 0..n. Scoring treats this as incorrect (no points), review
// screen shows it with a "Waktu habis" label instead of the user's pick.
export const TIMED_OUT_ANSWER = -1;

export interface QuizSettings {
  moduleFilter: string | null;
  shuffled: boolean;
  timerEnabled: boolean;
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  moduleFilter: null,
  shuffled: false,
  timerEnabled: true,
};

interface QuizState {
  phase: QuizPhase;
  settings: QuizSettings;
  filteredQuestions: QuizQuestion[];
  currentIdx: number;
  answers: Record<number, number>;
  timer: number;
  timerRunning: boolean;
  result: QuizResult | null;
}

type QuizAction =
  | { type: "START"; questions: QuizQuestion[]; settings: QuizSettings }
  | { type: "SELECT_ANSWER"; optionIdx: number }
  | { type: "TIMEOUT" }
  | { type: "NEXT_QUESTION" }
  | { type: "TIMER_TICK" }
  | { type: "FINISH" }
  | { type: "RESET_TO_SETTINGS" };

// Matches both "Modul 1" (akuntansi) and "Modul 1 / Topik 1" (statistik)
export function extractModule(category: string): string | null {
  const match = category.match(/^(Modul\s+\d+)/i);
  return match ? match[1].replace(/\s+/g, " ") : null;
}

export function getModulesFromQuestions(
  questions: QuizQuestion[]
): Array<{ id: string; count: number }> {
  const map = new Map<string, number>();
  for (const q of questions) {
    const mod = extractModule(q.category);
    if (mod) map.set(mod, (map.get(mod) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => {
      const aNum = parseInt(a.id.match(/\d+/)?.[0] ?? "0", 10);
      const bNum = parseInt(b.id.match(/\d+/)?.[0] ?? "0", 10);
      return aNum - bNum;
    });
}

function shuffleQuestions(items: QuizQuestion[]): QuizQuestion[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildQuestionSet(
  allQuestions: QuizQuestion[],
  settings: QuizSettings
): QuizQuestion[] {
  let filtered = settings.moduleFilter
    ? allQuestions.filter(
        (q) => extractModule(q.category) === settings.moduleFilter
      )
    : allQuestions;
  if (settings.shuffled) filtered = shuffleQuestions(filtered);
  return filtered;
}

const initialState: QuizState = {
  phase: "settings",
  settings: DEFAULT_QUIZ_SETTINGS,
  filteredQuestions: [],
  currentIdx: 0,
  answers: {},
  timer: QUIZ_TIMER_SECONDS,
  timerRunning: false,
  result: null,
};

function reducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "START": {
      const filteredQuestions = buildQuestionSet(
        action.questions,
        action.settings
      );
      return {
        phase: "playing",
        settings: action.settings,
        filteredQuestions,
        currentIdx: 0,
        answers: {},
        timer: QUIZ_TIMER_SECONDS,
        timerRunning: action.settings.timerEnabled,
        result: null,
      };
    }
    case "SELECT_ANSWER": {
      const current = state.filteredQuestions[state.currentIdx];
      if (!current) return state;
      if (state.answers[current.id] !== undefined) return state;
      return {
        ...state,
        answers: { ...state.answers, [current.id]: action.optionIdx },
        timerRunning: false,
      };
    }
    case "TIMEOUT": {
      const current = state.filteredQuestions[state.currentIdx];
      if (!current) return state;
      if (state.answers[current.id] !== undefined) return state;
      return {
        ...state,
        answers: { ...state.answers, [current.id]: TIMED_OUT_ANSWER },
        timer: 0,
        timerRunning: false,
      };
    }
    case "NEXT_QUESTION": {
      const nextIdx = state.currentIdx + 1;
      if (nextIdx >= state.filteredQuestions.length) return state;
      return {
        ...state,
        currentIdx: nextIdx,
        timer: QUIZ_TIMER_SECONDS,
        timerRunning: state.settings.timerEnabled,
      };
    }
    case "TIMER_TICK": {
      if (!state.timerRunning) return state;
      return { ...state, timer: Math.max(state.timer - 1, 0) };
    }
    case "FINISH": {
      const result = calculateQuizScore(
        state.filteredQuestions,
        state.answers
      );
      return { ...state, phase: "review", timerRunning: false, result };
    }
    case "RESET_TO_SETTINGS": {
      return { ...initialState, settings: state.settings };
    }
    default:
      return state;
  }
}

interface UseQuizOptions {
  questions: QuizQuestion[];
  onFinish?: (score: number, maxScore: number) => void;
  initialSettings?: Partial<QuizSettings>;
}

export function useQuiz({
  questions,
  onFinish,
  initialSettings,
}: UseQuizOptions) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    settings: { ...DEFAULT_QUIZ_SETTINGS, ...initialSettings },
  });

  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  // Tick every second while playing with timer on
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (!state.settings.timerEnabled) return;
    if (!state.timerRunning) return;

    const interval = setInterval(() => {
      dispatch({ type: "TIMER_TICK" });
    }, 1000);
    return () => clearInterval(interval);
  }, [state.phase, state.settings.timerEnabled, state.timerRunning]);

  // Timer expired without an answer: record TIMED_OUT_ANSWER so the review
  // screen and scoring treat it as wrong (no points) but the user still sees
  // the correct answer + explanation and advances manually via the Next button.
  useEffect(() => {
    if (state.phase !== "playing") return;
    if (!state.settings.timerEnabled) return;
    if (state.timer > 0) return;
    if (!state.timerRunning) return;
    dispatch({ type: "TIMEOUT" });
  }, [
    state.timer,
    state.timerRunning,
    state.phase,
    state.settings.timerEnabled,
  ]);

  // Fire onFinish once per review entry
  const firedFinishRef = useRef(false);
  useEffect(() => {
    if (state.phase === "review" && state.result && !firedFinishRef.current) {
      firedFinishRef.current = true;
      onFinishRef.current?.(state.result.totalScore, state.result.maxScore);
    }
    if (state.phase !== "review") firedFinishRef.current = false;
  }, [state.phase, state.result]);

  const start = useCallback(
    (settings: QuizSettings) => {
      dispatch({ type: "START", questions, settings });
    },
    [questions]
  );

  const selectAnswer = useCallback((optionIdx: number) => {
    dispatch({ type: "SELECT_ANSWER", optionIdx });
  }, []);

  const nextOrFinish = useCallback(() => {
    const isLast = state.currentIdx >= state.filteredQuestions.length - 1;
    dispatch({ type: isLast ? "FINISH" : "NEXT_QUESTION" });
  }, [state.currentIdx, state.filteredQuestions.length]);

  const resetToSettings = useCallback(() => {
    dispatch({ type: "RESET_TO_SETTINGS" });
  }, []);

  return {
    phase: state.phase,
    settings: state.settings,
    filteredQuestions: state.filteredQuestions,
    currentIdx: state.currentIdx,
    answers: state.answers,
    timer: state.timer,
    timerRunning: state.timerRunning,
    result: state.result,
    start,
    selectAnswer,
    nextOrFinish,
    resetToSettings,
  };
}
