"use client";

import { createElement, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, Lock, Scale, Gavel, Eye, Wifi, Globe, FlaskConical, Dna, Users,
  ListChecks, Home, Megaphone, ShieldAlert, AlertTriangle, Brain, HeartCrack,
  EyeOff, Leaf, TrendingUp, Recycle, Sprout, Handshake, ShieldCheck, FileCheck,
  Building2, Sparkles, Quote, Check, X, Flag,
  type LucideIcon,
} from "lucide-react";
import type { KilatCard } from "@/types";
import type { KilatResponse } from "./use-kilat";
import { parseInline } from "@/lib/content-parser";
import { sounds } from "@/lib/sounds";
import { cn } from "@/lib/utils";
import {
  fadeInUp, scaleIn, staggerContainer, staggerItem, tapScale,
} from "@/lib/motion";

// ─── Icon resolver (content carries lucide names) ───
const ICONS: Record<string, LucideIcon> = {
  Shield, Lock, Scale, Gavel, Eye, Wifi, Globe, FlaskConical, Dna, Users,
  ListChecks, Home, Megaphone, ShieldAlert, AlertTriangle, Brain, HeartCrack,
  EyeOff, Leaf, TrendingUp, Recycle, Sprout, Handshake, ShieldCheck, FileCheck,
  Building2,
};
function iconFor(name?: string): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

interface CardProps {
  card: KilatCard;
  response?: KilatResponse;
  onAnswer: (selected: number, correct: boolean) => void;
  onMatchComplete: () => void;
}

// ─── Small bits ───
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

function Feedback({
  correct,
  children,
}: {
  correct: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "mt-4 flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed",
        correct
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      )}
    >
      <span className="mt-0.5 shrink-0">
        {correct ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </span>
      <span>{children}</span>
    </motion.div>
  );
}

// One tappable option row (shared by check / checkpoint / fill / scenario).
function Option({
  label,
  state,
  onClick,
  disabled,
}: {
  label: React.ReactNode;
  state: "idle" | "correct" | "wrong" | "dim";
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <motion.button
      type="button"
      variants={staggerItem}
      whileTap={disabled ? undefined : tapScale}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors",
        state === "idle" &&
          "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
        state === "correct" &&
          "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        state === "wrong" &&
          "border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200",
        state === "dim" && "border-border bg-card opacity-50"
      )}
    >
      <span className="flex-1">{label}</span>
      {state === "correct" && <Check className="h-4 w-4 shrink-0" />}
      {state === "wrong" && <X className="h-4 w-4 shrink-0" />}
    </motion.button>
  );
}

// ─── Intro (chapter divider) ───
function IntroCard({ card }: { card: Extract<KilatCard, { kind: "intro" }> }) {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-warm">
        <Flag className="h-8 w-8" />
      </div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Bab {card.chapter}
      </p>
      <h2 className="font-heading text-2xl font-bold sm:text-3xl">{card.title}</h2>
      {card.subtitle && (
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
          {card.subtitle}
        </p>
      )}
    </motion.div>
  );
}

// ─── Explain ───
function ExplainCard({ card }: { card: Extract<KilatCard, { kind: "explain" }> }) {
  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible">
      <motion.div
        variants={staggerItem}
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-warm"
      >
        {createElement(iconFor(card.icon), { className: "h-7 w-7" })}
      </motion.div>
      {card.tag && (
        <motion.div variants={staggerItem} className="mb-3">
          <Tag>{card.tag}</Tag>
        </motion.div>
      )}
      <motion.h2
        variants={staggerItem}
        className="font-heading text-xl font-bold leading-tight sm:text-2xl"
      >
        {parseInline(card.heading)}
      </motion.h2>
      <motion.p
        variants={staggerItem}
        className="mt-3 text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]"
      >
        {parseInline(card.body)}
      </motion.p>
    </motion.div>
  );
}

// ─── Quote ───
function QuoteCard({ card }: { card: Extract<KilatCard, { kind: "quote" }> }) {
  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <Quote className="h-9 w-9 text-primary/40" />
      <blockquote className="mt-3 font-heading text-2xl font-semibold leading-snug sm:text-[28px]">
        {parseInline(card.text)}
      </blockquote>
      {card.source && (
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          {card.source}
        </p>
      )}
    </motion.div>
  );
}

// ─── Check / Checkpoint (single correct option) ───
function ChoiceCard({
  card,
  response,
  onAnswer,
  isCheckpoint,
}: {
  card: Extract<KilatCard, { kind: "check" | "checkpoint" }>;
  response?: KilatResponse;
  onAnswer: (selected: number, correct: boolean) => void;
  isCheckpoint: boolean;
}) {
  const answered = !!response;
  const lockedCorrect = response?.correct === true;

  const stateFor = (idx: number): "idle" | "correct" | "wrong" | "dim" => {
    if (!answered) return "idle";
    if (idx === card.answer) return "correct";
    if (idx === response?.selected) return "wrong";
    return "dim";
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {isCheckpoint ? <Flag className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </span>
        <Tag>{isCheckpoint ? (card as { title?: string }).title || "Checkpoint" : "Cek cepat"}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(card.question)}
      </h2>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {card.options.map((opt, idx) => (
          <Option
            key={idx}
            label={parseInline(opt)}
            state={stateFor(idx)}
            disabled={lockedCorrect}
            onClick={() => {
              if (lockedCorrect) return;
              onAnswer(idx, idx === card.answer);
            }}
          />
        ))}
      </motion.div>
      {answered && (
        <Feedback correct={response!.correct}>
          {response!.correct
            ? parseInline(card.explain)
            : isCheckpoint
              ? "Hampir! Pilih lagi jawaban yang benar buat lanjut."
              : parseInline(card.explain)}
        </Feedback>
      )}
    </div>
  );
}

// ─── Fill in the blank ───
function FillCard({
  card,
  response,
  onAnswer,
}: {
  card: Extract<KilatCard, { kind: "fill" }>;
  response?: KilatResponse;
  onAnswer: (selected: number, correct: boolean) => void;
}) {
  const answered = !!response;
  const lockedCorrect = response?.correct === true;
  const chosenLabel =
    answered && response!.selected >= 0
      ? card.options[response!.selected]
      : answered
        ? card.options[card.answer]
        : null;

  return (
    <div>
      <div className="mb-3">
        <Tag>Lengkapi kalimat</Tag>
      </div>
      <p className="font-heading text-xl font-semibold leading-relaxed sm:text-2xl">
        {parseInline(card.before)}{" "}
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
          {chosenLabel ? parseInline(chosenLabel) : "..."}
        </span>{" "}
        {parseInline(card.after)}
      </p>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-wrap gap-2"
      >
        {card.options.map((opt, idx) => {
          const state =
            !answered
              ? "idle"
              : idx === card.answer
                ? "correct"
                : idx === response?.selected
                  ? "wrong"
                  : "dim";
          return (
            <motion.button
              key={idx}
              type="button"
              variants={staggerItem}
              whileTap={lockedCorrect ? undefined : tapScale}
              disabled={lockedCorrect}
              onClick={() => {
                if (lockedCorrect) return;
                onAnswer(idx, idx === card.answer);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                state === "idle" &&
                  "border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                state === "correct" &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
                state === "wrong" &&
                  "border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200",
                state === "dim" && "border-border bg-card opacity-50"
              )}
            >
              {parseInline(opt)}
            </motion.button>
          );
        })}
      </motion.div>
      {answered && card.explain && (
        <Feedback correct={response!.correct}>{parseInline(card.explain)}</Feedback>
      )}
    </div>
  );
}

// ─── Scenario (per-choice feedback) ───
function ScenarioCard({
  card,
  response,
  onAnswer,
}: {
  card: Extract<KilatCard, { kind: "scenario" }>;
  response?: KilatResponse;
  onAnswer: (selected: number, correct: boolean) => void;
}) {
  const answered = !!response;
  const lockedCorrect = response?.correct === true;
  const correctIdx = card.choices.findIndex((c) => c.correct);
  const chosen = answered ? response!.selected : -1;

  const stateFor = (idx: number): "idle" | "correct" | "wrong" | "dim" => {
    if (!answered) return "idle";
    if (idx === correctIdx) return "correct";
    if (idx === chosen) return "wrong";
    return "dim";
  };

  return (
    <div>
      <div className="mb-3">
        <Tag>{card.tag || "Skenario"}</Tag>
      </div>
      <p className="text-[17px] font-semibold leading-relaxed sm:text-lg">
        {parseInline(card.situation)}
      </p>
      <motion.div
        variants={staggerContainer(0.06)}
        initial="hidden"
        animate="visible"
        className="mt-5 flex flex-col gap-2.5"
      >
        {card.choices.map((choice, idx) => (
          <Option
            key={idx}
            label={parseInline(choice.text)}
            state={stateFor(idx)}
            disabled={lockedCorrect}
            onClick={() => {
              if (lockedCorrect) return;
              onAnswer(idx, choice.correct);
            }}
          />
        ))}
      </motion.div>
      {answered && chosen >= 0 && (
        <Feedback correct={response!.correct}>
          {parseInline(card.choices[chosen].feedback)}
        </Feedback>
      )}
    </div>
  );
}

// ─── Match (tap term then its definition) ───
function MatchCard({
  card,
  response,
  onMatchComplete,
}: {
  card: Extract<KilatCard, { kind: "match" }>;
  response?: KilatResponse;
  onMatchComplete: () => void;
}) {
  const done = response?.correct === true;
  // Shuffle the definitions once per mount.
  const shuffledDefs = useMemo(() => {
    const arr = card.pairs.map((p, i) => ({ def: p.def, idx: i }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const [selTerm, setSelTerm] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);

  const allMatched = done || matched.size === card.pairs.length;

  function tapDef(defIdx: number) {
    if (selTerm === null || matched.has(defIdx)) return;
    if (defIdx === selTerm) {
      sounds.correct();
      const next = new Set(matched).add(defIdx);
      setMatched(next);
      setSelTerm(null);
      if (next.size === card.pairs.length) onMatchComplete();
    } else {
      sounds.wrong();
      setWrong(defIdx);
      setTimeout(() => setWrong(null), 360);
      setSelTerm(null);
    }
  }

  return (
    <div>
      <div className="mb-3">
        <Tag>Jodohin</Tag>
      </div>
      <h2 className="font-heading text-lg font-bold sm:text-xl">
        {card.prompt || "Pasangkan istilah dengan artinya"}
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {/* Terms */}
        <div className="flex flex-col gap-2.5">
          {card.pairs.map((p, idx) => {
            const isMatched = allMatched || matched.has(idx);
            const isSel = selTerm === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={isMatched}
                onClick={() => { sounds.click(); setSelTerm(idx); }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  isMatched
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : isSel
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40"
                )}
              >
                {parseInline(p.term)}
              </button>
            );
          })}
        </div>
        {/* Definitions */}
        <div className="flex flex-col gap-2.5">
          {shuffledDefs.map(({ def, idx }) => {
            const isMatched = allMatched || matched.has(idx);
            const isWrong = wrong === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={isMatched}
                onClick={() => tapDef(idx)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-[13px] leading-snug transition-colors",
                  isMatched
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : isWrong
                      ? "border-rose-500/60 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                      : "border-border bg-card hover:border-primary/40"
                )}
              >
                {parseInline(def)}
              </button>
            );
          })}
        </div>
      </div>
      {allMatched ? (
        <Feedback correct>Mantap, semua kepasangin!</Feedback>
      ) : (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {selTerm === null
            ? "Tap istilah dulu, baru tap artinya."
            : "Sekarang tap arti yang cocok."}
        </p>
      )}
    </div>
  );
}

// ─── Router ───
export function KilatCardView({ card, response, onAnswer, onMatchComplete }: CardProps) {
  switch (card.kind) {
    case "intro":
      return <IntroCard card={card} />;
    case "explain":
      return <ExplainCard card={card} />;
    case "quote":
      return <QuoteCard card={card} />;
    case "check":
      return <ChoiceCard card={card} response={response} onAnswer={onAnswer} isCheckpoint={false} />;
    case "checkpoint":
      return <ChoiceCard card={card} response={response} onAnswer={onAnswer} isCheckpoint />;
    case "fill":
      return <FillCard card={card} response={response} onAnswer={onAnswer} />;
    case "scenario":
      return <ScenarioCard card={card} response={response} onAnswer={onAnswer} />;
    case "match":
      return <MatchCard card={card} response={response} onMatchComplete={onMatchComplete} />;
    default:
      return null;
  }
}
