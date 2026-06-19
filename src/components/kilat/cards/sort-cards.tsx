"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownUp, Boxes } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback, seededShuffle } from "./card-bits";

// ─── Order / sequence: build the order first, then check (no instant fail) ───
export function OrderCard({ card, response, onAnswer }: KilatCardProps) {
  const { t } = useTranslation();
  const c = card as Extract<KilatCard, { kind: "order" }>;
  const answered = !!response;
  const shuffled = useMemo(
    () => seededShuffle(c.steps.map((t, i) => ({ t, oi: i })), c.id),
    [c.id, c.steps]
  );
  const [built, setBuilt] = useState<number[]>([]);

  const tap = (oi: number) => {
    if (answered || built.includes(oi)) return;
    setBuilt((b) => [...b, oi]);
  };
  const undo = () => setBuilt((b) => b.slice(0, -1));
  const submit = () => {
    if (answered || built.length !== c.steps.length) return;
    const correct = built.every((oi, pos) => oi === pos);
    onAnswer(correct, { built });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ArrowDownUp className="h-4 w-4" />
        </span>
        <Tag>{t("kilat.tag_order")}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.prompt)}
      </h2>

      {answered ? (
        <div className="mt-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Urutan yang benar
          </p>
          {c.steps.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-[15px]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                {i + 1}
              </span>
              <span className="flex-1">{parseInline(s)}</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            Tap berurutan sesuai langkah yang benar. Nomornya ngikutin pilihanmu, dan bisa di-undo sebelum dicek.
          </p>
          <motion.div
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
            className="mt-3 flex flex-col gap-2.5"
          >
            {shuffled.map(({ t, oi }) => {
              const placedAt = built.indexOf(oi);
              const placed = placedAt >= 0;
              return (
                <motion.button
                  key={oi}
                  type="button"
                  variants={staggerItem}
                  disabled={placed}
                  onClick={() => tap(oi)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
                    placed
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      placed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {placed ? placedAt + 1 : ""}
                  </span>
                  <span className="flex-1">{parseInline(t)}</span>
                </motion.button>
              );
            })}
          </motion.div>
          <div className="mt-4 flex gap-2.5">
            {built.length > 0 && (
              <button
                type="button"
                onClick={undo}
                className="hs-press h-10 rounded-xl border border-border bg-card px-4 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={built.length !== c.steps.length}
              className="hs-press h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
            >
              Cek urutan ({built.length}/{c.steps.length})
            </button>
          </div>
        </>
      )}

      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>
          {response!.correct
            ? c.explain
              ? parseInline(c.explain)
              : t("kilat.order_correct")
            : t("kilat.order_wrong")}
        </Feedback>
      )}
    </div>
  );
}

// ─── Categorize (cycle each item through buckets, then check) ───
const BUCKET_TONE = [
  "border-primary/50 bg-primary/10 text-primary",
  "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300",
];

export function CategorizeCard({ card, response, onAnswer }: KilatCardProps) {
  const { t } = useTranslation();
  const c = card as Extract<KilatCard, { kind: "categorize" }>;
  const answered = !!response;
  const locked = (response?.data as { assign: number[] } | undefined)?.assign;
  const [assign, setAssign] = useState<number[]>(() => c.items.map(() => -1));

  const cur = answered && locked ? locked : assign;
  const allAssigned = cur.every((b) => b >= 0);

  const cycle = (i: number) => {
    if (answered) return;
    setAssign((a) => {
      const next = [...a];
      next[i] = (next[i] + 1 + c.buckets.length) % c.buckets.length;
      // start unassigned (-1) -> 0
      if (a[i] < 0) next[i] = 0;
      return next;
    });
  };

  const submit = () => {
    if (answered || !allAssigned) return;
    const correct = c.items.every((it, i) => assign[i] === it.bucket);
    onAnswer(correct, { assign: [...assign] });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Boxes className="h-4 w-4" />
        </span>
        <Tag>{t("kilat.tag_categorize")}</Tag>
      </div>
      <h2 className="font-heading text-xl font-bold leading-tight sm:text-2xl">
        {parseInline(c.prompt)}
      </h2>

      {/* Bucket legend */}
      <div className="mt-3 flex flex-wrap gap-2">
        {c.buckets.map((b, i) => (
          <span
            key={i}
            className={cn("rounded-full border px-3 py-1 text-xs font-semibold", BUCKET_TONE[i % 4])}
          >
            {b}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {answered ? t("kilat.result") : t("kilat.cat_hint")}
      </p>

      <div className="mt-2 flex flex-col gap-2.5">
        {c.items.map((it, i) => {
          const chosen = cur[i];
          const right = chosen === it.bucket;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => cycle(i)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
                answered
                  ? right
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-rose-500/50 bg-rose-500/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <span className="flex-1">{parseInline(it.text)}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  chosen >= 0 ? BUCKET_TONE[chosen % 4] : "border-dashed border-border text-muted-foreground"
                )}
              >
                {chosen >= 0 ? c.buckets[chosen] : "pilih"}
              </span>
            </button>
          );
        })}
      </div>

      {!answered && (
        <button
          type="button"
          onClick={submit}
          disabled={!allAssigned}
          className="hs-press mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Cek jawaban
        </button>
      )}
      {answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>
          {response!.correct
            ? c.explain
              ? parseInline(c.explain)
              : t("kilat.cat_all_correct")
            : t("kilat.cat_some_wrong")}
        </Feedback>
      )}
    </div>
  );
}
