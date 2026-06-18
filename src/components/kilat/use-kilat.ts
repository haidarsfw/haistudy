"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KilatCard, KilatProgress, SubjectKilat } from "@/types";
import { sounds } from "@/lib/sounds";

export interface KilatResponse {
  /** Chosen option index for single-choice cards; -1 for match/resumed. */
  selected: number;
  correct: boolean;
}

// XP awarded per interaction. Explain/quote/intro give none so XP stays meaningful.
const XP: Partial<Record<KilatCard["kind"], { right: number; wrong: number }>> = {
  check: { right: 10, wrong: 2 },
  scenario: { right: 15, wrong: 3 },
  fill: { right: 10, wrong: 2 },
  match: { right: 15, wrong: 0 },
  checkpoint: { right: 20, wrong: 0 },
};

interface Args {
  feed: SubjectKilat;
  initial?: KilatProgress;
  onPersist: (state: KilatProgress) => void;
}

export function useKilat({ feed, initial, onPersist }: Args) {
  const cards = feed.cards;
  const total = cards.length;

  // Resume: seed answered cards so XP isn't re-awarded on re-answer. The exact
  // option isn't stored (only correctness), so selected is -1 in review.
  const seedResponses = useMemo<Record<string, KilatResponse>>(() => {
    const r: Record<string, KilatResponse> = {};
    if (initial?.answered) {
      for (const [id, correct] of Object.entries(initial.answered)) {
        r[id] = { selected: -1, correct };
      }
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startIndex = initial?.reached ? Math.min(initial.reached, total - 1) : 0;
  const [index, setIndex] = useState(startIndex);
  const [reached, setReached] = useState(startIndex);
  const [responses, setResponses] = useState<Record<string, KilatResponse>>(seedResponses);
  const [xp, setXp] = useState(initial?.xp ?? 0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(initial?.bestStreak ?? 0);
  const [chaptersDone, setChaptersDone] = useState<number[]>(initial?.chaptersDone ?? []);

  const completed = useMemo(
    () => feed.chapters.every((c) => chaptersDone.includes(c.n)),
    [feed.chapters, chaptersDone]
  );

  const current: KilatCard | undefined = cards[index];
  const canAdvance =
    current?.kind !== "checkpoint" || responses[current.id]?.correct === true;

  // Keep bestStreak in sync without nesting setState calls.
  useEffect(() => {
    setBestStreak((b) => Math.max(b, streak));
  }, [streak]);

  // Persist on every meaningful change (skip the initial mount). Downstream
  // saveKilatState writes localStorage now + debounces the server sync.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const answered: Record<string, boolean> = {};
    for (const [id, r] of Object.entries(responses)) answered[id] = r.correct;
    onPersist({ reached, xp, bestStreak, answered, chaptersDone, completed });
  }, [responses, xp, bestStreak, chaptersDone, reached, completed, onPersist]);

  const answer = useCallback(
    (card: KilatCard, selected: number, correct: boolean) => {
      const alreadyCorrect = responses[card.id]?.correct === true;
      setResponses((prev) => ({ ...prev, [card.id]: { selected, correct } }));
      if (alreadyCorrect) return; // never double-award or re-trigger sounds

      const rule = XP[card.kind];
      if (rule) setXp((x) => x + (correct ? rule.right : rule.wrong));
      if (correct) {
        sounds.correct();
        setStreak((s) => s + 1);
        if (card.kind === "checkpoint") {
          setChaptersDone((d) =>
            d.includes(card.chapter) ? d : [...d, card.chapter]
          );
        }
      } else {
        sounds.wrong();
        setStreak(0);
      }
    },
    [responses]
  );

  const completeMatch = useCallback(
    (card: KilatCard) => {
      if (responses[card.id]?.correct === true) return;
      setResponses((prev) => ({ ...prev, [card.id]: { selected: -1, correct: true } }));
      setXp((x) => x + (XP.match?.right ?? 0));
      sounds.correct();
      setStreak((s) => s + 1);
    },
    [responses]
  );

  const goNext = useCallback(() => {
    setIndex((i) => {
      const card = cards[i];
      // Checkpoint gates the feed until cleared correctly.
      if (card?.kind === "checkpoint" && responses[card.id]?.correct !== true) {
        return i;
      }
      const next = Math.min(i + 1, total - 1);
      setReached((r) => Math.max(r, next));
      return next;
    });
  }, [cards, responses, total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setResponses({});
    setXp(0);
    setStreak(0);
    setBestStreak(0);
    setChaptersDone([]);
    setIndex(0);
    setReached(0);
    firstRun.current = false; // force a persist of the cleared state
  }, []);

  return {
    cards,
    total,
    index,
    current,
    responses,
    xp,
    streak,
    bestStreak,
    chaptersDone,
    reached,
    completed,
    canAdvance,
    answer,
    completeMatch,
    goNext,
    goPrev,
    reset,
    setIndex,
  };
}

export type UseKilatReturn = ReturnType<typeof useKilat>;
