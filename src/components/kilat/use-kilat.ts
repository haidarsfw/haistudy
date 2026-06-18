"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KilatCard, KilatProgress, SubjectKilat } from "@/types";
import { sounds } from "@/lib/sounds";
import { isGated, isGraded, POINTS_PER_CARD, type KilatResponse } from "./kilat-types";

export type CardStatus = "correct" | "wrong" | "skipped" | "done" | "todo" | "locked";

function gradedPoints(
  responses: Record<string, KilatResponse>,
  cards: KilatCard[]
): number {
  let p = 0;
  for (const card of cards) {
    if (isGraded(card) && responses[card.id]?.correct) p += POINTS_PER_CARD;
  }
  return p;
}

function gradedAnswered(
  responses: Record<string, KilatResponse>,
  cards: KilatCard[]
): Record<string, boolean> {
  const m: Record<string, boolean> = {};
  for (const card of cards) {
    if (isGraded(card) && responses[card.id]) m[card.id] = responses[card.id].correct;
  }
  return m;
}

interface Args {
  feed: SubjectKilat;
  initial?: KilatProgress;
  onPersist: (state: KilatProgress) => void;
}

export function useKilat({ feed, initial, onPersist }: Args) {
  const cards = feed.cards;
  const total = cards.length;

  const gradedTotal = useMemo(
    () => cards.filter(isGraded).length * POINTS_PER_CARD,
    [cards]
  );

  // Resume: rebuild responses from persisted graded answers + skips. (Ungraded
  // completions like match aren't persisted - they just replay, harmless.)
  const seedResponses = useMemo<Record<string, KilatResponse>>(() => {
    const r: Record<string, KilatResponse> = {};
    if (initial?.answered) {
      for (const [id, correct] of Object.entries(initial.answered)) r[id] = { correct };
    }
    if (initial?.skipped) {
      for (const id of initial.skipped) if (!r[id]) r[id] = { correct: false, data: { skipped: true } };
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startIndex = initial?.reached ? Math.min(initial.reached, total - 1) : 0;
  const [index, setIndex] = useState(startIndex);
  const [reached, setReached] = useState(startIndex);
  const [responses, setResponses] = useState<Record<string, KilatResponse>>(seedResponses);
  // Points are derived from answered (migration-safe: ignores any legacy xp).
  const [points, setPoints] = useState(() => gradedPoints(seedResponses, cards));
  const [skipped, setSkipped] = useState<string[]>(initial?.skipped ?? []);
  const [chaptersDone, setChaptersDone] = useState<number[]>(initial?.chaptersDone ?? []);
  const [pendingSkip, setPendingSkip] = useState(false);

  const completed = useMemo(
    () => feed.chapters.every((c) => chaptersDone.includes(c.n)),
    [feed.chapters, chaptersDone]
  );

  const current: KilatCard | undefined = cards[index];
  const isDone = (card: KilatCard) => !!responses[card.id];
  const canAdvance = !current || !isGated(current) || isDone(current);

  const scorePct = gradedTotal > 0 ? Math.round((points / gradedTotal) * 100) : 100;
  const passed = scorePct >= 90;

  // Reset the skip "arm" whenever the card changes.
  useEffect(() => {
    setPendingSkip(false);
  }, [index]);

  // Persist on meaningful change (skip first mount).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    onPersist({
      reached,
      points,
      answered: gradedAnswered(responses, cards),
      skipped,
      chaptersDone,
      completed,
    });
  }, [responses, points, skipped, reached, chaptersDone, completed, cards, onPersist]);

  // Lock on first answer (anti-cheat). data carries the card-specific response.
  const answer = useCallback(
    (card: KilatCard, correct: boolean, data?: unknown) => {
      if (responses[card.id]) return; // already locked
      setResponses((prev) => ({ ...prev, [card.id]: { correct, data } }));
      setPendingSkip(false);
      const graded = isGraded(card);
      if (graded && correct) setPoints((p) => p + POINTS_PER_CARD);
      if (card.kind === "checkpoint" && correct) {
        setChaptersDone((d) => (d.includes(card.chapter) ? d : [...d, card.chapter]));
      }
      if (graded) {
        if (correct) sounds.correct();
        else sounds.wrong();
      } else {
        sounds.toggle();
      }
    },
    [responses]
  );

  const markSkipped = useCallback(
    (card: KilatCard) => {
      if (responses[card.id]) return;
      setResponses((prev) => ({ ...prev, [card.id]: { correct: false, data: { skipped: true } } }));
      setSkipped((s) => (s.includes(card.id) ? s : [...s, card.id]));
    },
    [responses]
  );

  const advance = useCallback(() => {
    setIndex((i) => {
      const next = Math.min(i + 1, total - 1);
      setReached((r) => Math.max(r, next));
      return next;
    });
  }, [total]);

  // First press on a gated card arms the skip + shows a hint; second press skips.
  const goNext = useCallback(() => {
    const card = cards[index];
    const gated = !!card && isGated(card) && !responses[card.id];
    if (gated && !pendingSkip) {
      setPendingSkip(true);
      return;
    }
    if (gated && pendingSkip) markSkipped(card);
    setPendingSkip(false);
    advance();
  }, [cards, index, responses, pendingSkip, markSkipped, advance]);

  const goPrev = useCallback(() => {
    setPendingSkip(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const jumpTo = useCallback(
    (i: number) => {
      if (i < 0 || i > reached) return; // only revisit reached cards
      setPendingSkip(false);
      setIndex(i);
    },
    [reached]
  );

  const reset = useCallback(() => {
    setResponses({});
    setPoints(0);
    setSkipped([]);
    setChaptersDone([]);
    setIndex(0);
    setReached(0);
    setPendingSkip(false);
    firstRun.current = false; // persist the cleared state
  }, []);

  const cardStatus = useCallback(
    (i: number): CardStatus => {
      const card = cards[i];
      if (!card) return "locked";
      if (skipped.includes(card.id)) return "skipped";
      const r = responses[card.id];
      if (r) return isGraded(card) ? (r.correct ? "correct" : "wrong") : "done";
      if (i > reached) return "locked";
      return "todo";
    },
    [cards, responses, skipped, reached]
  );

  const firstIndexOfChapter = useCallback(
    (n: number) => cards.findIndex((c) => c.chapter === n),
    [cards]
  );

  return {
    cards,
    total,
    index,
    current,
    responses,
    points,
    gradedTotal,
    scorePct,
    passed,
    skipped,
    chaptersDone,
    reached,
    completed,
    canAdvance,
    pendingSkip,
    answer,
    goNext,
    goPrev,
    jumpTo,
    reset,
    cardStatus,
    firstIndexOfChapter,
  };
}

export type UseKilatReturn = ReturnType<typeof useKilat>;
