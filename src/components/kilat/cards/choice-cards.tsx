"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flag, Sparkles, ListChecks } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { staggerContainer, tapScale } from "@/lib/motion";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback, Option, singleState } from "./card-bits";

type Resp = { selected: number };

// ─── Check / Checkpoint (single correct option) ───
export function ChoiceCard({
  card,
  response,
  onAnswer,
  isCheckpoint,
}: KilatCardProps & { isCheckpoint: boolean }) {
  const c = card as Extract<KilatCard, { kind: "check" | "checkpoint" }>;
  const answered = !!response;
  const chosen = (response?.data as Resp | undefined)?.selected;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {isCheckpoint ? <Flag className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <Tag>{isCheckpoint ? (c as { title?: string }).title || "Checkpoint" : "Cek cepat"}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.question)}
      </h2>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {c.options.map((opt, idx) => (
          <Option
            key={idx}
            label={parseInline(opt)}
            state={singleState(answered, idx, c.answer, chosen)}
            disabled={answered}
            onClick={() => !answered && onAnswer(idx === c.answer, { selected: idx })}
          />
        ))}
      </motion.div>
      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>
          {parseInline(c.explain)}
        </Feedback>
      )}
    </div>
  );
}

// ─── Fill in the blank ───
export function FillCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "fill" }>;
  const answered = !!response;
  const chosen = (response?.data as Resp | undefined)?.selected;
  const blankLabel =
    answered && chosen !== undefined ? c.options[chosen] : answered ? c.options[c.answer] : null;

  return (
    <div>
      <div className="mb-3">
        <Tag>Lengkapi kalimat</Tag>
      </div>
      <p className="font-heading text-xl font-semibold leading-relaxed sm:text-2xl">
        {parseInline(c.before)}{" "}
        <span
          className={cn(
            "mx-0.5 inline-flex min-w-[88px] items-center justify-center rounded-lg border-b-2 px-2 py-0.5 align-baseline",
            answered
              ? response!.correct
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              : "border-primary/50 bg-primary/5 text-primary"
          )}
        >
          {blankLabel ? parseInline(blankLabel) : "..."}
        </span>{" "}
        {parseInline(c.after)}
      </p>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-wrap gap-2"
      >
        {c.options.map((opt, idx) => {
          const state = singleState(answered, idx, c.answer, chosen);
          return (
            <motion.button
              key={idx}
              type="button"
              whileTap={answered ? undefined : tapScale}
              disabled={answered}
              onClick={() => !answered && onAnswer(idx === c.answer, { selected: idx })}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                state === "idle" && "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                state === "correct" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                state === "wrong" && "border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200",
                state === "dim" && "border-border bg-card opacity-50"
              )}
            >
              {parseInline(opt)}
            </motion.button>
          );
        })}
      </motion.div>
      {answered && c.explain && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>{parseInline(c.explain)}</Feedback>
      )}
    </div>
  );
}

// ─── Multi-select (pick all correct) ───
function setEq(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export function MultiCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "multi" }>;
  const answered = !!response;
  const locked = (response?.data as { selected: number[] } | undefined)?.selected;
  const [sel, setSel] = useState<number[]>([]);

  const toggle = (idx: number) =>
    setSel((s) => (s.includes(idx) ? s.filter((x) => x !== idx) : [...s, idx]));

  const submit = () => {
    if (answered || sel.length === 0) return;
    onAnswer(setEq(sel, c.answers), { selected: [...sel] });
  };

  const chosen = answered ? locked ?? [] : sel;
  const optState = (idx: number) => {
    if (!answered) return sel.includes(idx) ? "selected" : "idle";
    const isAns = c.answers.includes(idx);
    if (isAns) return "correct";
    if (chosen.includes(idx)) return "wrong";
    return "dim";
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="h-4 w-4" />
        </span>
        <Tag>Pilih semua yang benar</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.question)}
      </h2>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {c.options.map((opt, idx) => (
          <Option
            key={idx}
            label={parseInline(opt)}
            state={optState(idx)}
            disabled={answered}
            onClick={() => !answered && toggle(idx)}
          />
        ))}
      </motion.div>
      {!answered && (
        <button
          type="button"
          onClick={submit}
          disabled={sel.length === 0}
          className="hs-press mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Cek jawaban ({sel.length} dipilih)
        </button>
      )}
      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>{parseInline(c.explain)}</Feedback>
      )}
    </div>
  );
}

// ─── Scenario (per-choice feedback, optional one-step branch) ───
export function ScenarioCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "scenario" }>;
  const answered = !!response;
  const chosen = (response?.data as Resp | undefined)?.selected;
  const correctIdx = c.choices.findIndex((ch) => ch.correct);
  const [followSel, setFollowSel] = useState<number | null>(null);

  return (
    <div>
      <div className="mb-3">
        <Tag>{c.tag || "Skenario"}</Tag>
      </div>
      <p className="text-[17px] font-semibold leading-relaxed sm:text-lg">
        {parseInline(c.situation)}
      </p>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {c.choices.map((choice, idx) => (
          <Option
            key={idx}
            label={parseInline(choice.text)}
            state={singleState(answered, idx, correctIdx, chosen)}
            disabled={answered}
            onClick={() => !answered && onAnswer(choice.correct, { selected: idx })}
          />
        ))}
      </motion.div>
      {answered && chosen !== undefined && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>
          {parseInline(c.choices[chosen].feedback)}
        </Feedback>
      )}

      {/* One-step branch: shows after the main choice is locked. Ungraded. */}
      {answered && c.follow && (
        <div className="mt-6 border-t border-border pt-5">
          <div className="mb-3">
            <Tag>Terus gimana?</Tag>
          </div>
          <p className="text-[16px] font-semibold leading-relaxed">
            {parseInline(c.follow.situation)}
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            {c.follow.choices.map((choice, idx) => (
              <Option
                key={idx}
                label={parseInline(choice.text)}
                state={
                  followSel === null
                    ? "idle"
                    : idx === c.follow!.choices.findIndex((x) => x.correct)
                      ? "correct"
                      : idx === followSel
                        ? "wrong"
                        : "dim"
                }
                disabled={followSel !== null}
                onClick={() => followSel === null && setFollowSel(idx)}
              />
            ))}
          </div>
          {followSel !== null && (
            <Feedback tone={c.follow.choices[followSel].correct ? "correct" : "wrong"}>
              {parseInline(c.follow.choices[followSel].feedback)}
            </Feedback>
          )}
        </div>
      )}
    </div>
  );
}
