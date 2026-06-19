"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, X, ThumbsUp, ThumbsDown } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import { useTranslation } from "@/components/providers/language-provider";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback } from "./card-bits";

export function SwipeCard({ card, response, onAnswer }: KilatCardProps) {
  const { t } = useTranslation();
  const c = card as Extract<KilatCard, { kind: "swipe" }>;
  const answered = !!response;
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [results, setResults] = useState<boolean[]>([]); // user judgment correct?

  const judge = (saysTrue: boolean) => {
    if (answered || idx >= c.statements.length) return;
    const ok = saysTrue === c.statements[idx].isTrue;
    sounds.click();
    setDir(saysTrue ? 1 : -1);
    const next = [...results, ok];
    if (idx + 1 >= c.statements.length) {
      onAnswer(next.every(Boolean), { results: next });
    } else {
      setResults(next);
      setIdx(idx + 1);
    }
  };

  if (answered) {
    // Per-statement USER correctness (did they guess right), not the statement's
    // truth value. Coloring rows by truth made a correctly-identified false
    // statement look like the user erred. `data.results` carries the per-item
    // judgement; on resume it's absent, so fall back to all-correct from
    // `response.correct` (and a neutral row when we genuinely can't tell).
    const userResults = (response!.data as { results?: boolean[] } | undefined)?.results;
    const allCorrect = response!.correct;
    const okFor = (i: number): boolean | undefined =>
      userResults ? !!userResults[i] : allCorrect ? true : undefined;

    return (
      <div>
        <div className="mb-3">
          <Tag>{t("kilat.tag_swipe")}</Tag>
        </div>

        {/* Distinct, celebratory header when every guess was right */}
        {allCorrect && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-5 w-5 text-emerald-600" />
            </span>
            <span>
              <span className="block text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {t("kilat.swipe_all_correct")}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t("kilat.swipe_all_correct_sub")}
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {c.statements.map((s, i) => {
            const ok = okFor(i);
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-sm",
                  ok === undefined
                    ? "border-border bg-card"
                    : ok
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-rose-500/40 bg-rose-500/10"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {ok === undefined ? (
                    <span className="block h-4 w-4" />
                  ) : ok ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-rose-600" />
                  )}
                </span>
                <span className="min-w-0">
                  {ok !== undefined && (
                    <span
                      className={cn(
                        "font-semibold",
                        ok
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-rose-700 dark:text-rose-300"
                      )}
                    >
                      {ok ? t("kilat.swipe_right") : t("kilat.swipe_wrong")}{" "}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {s.isTrue ? t("kilat.fact_true") : t("kilat.fact_false")}
                  </span>{" "}
                  {parseInline(s.text)}
                  {s.note ? (
                    <span className="text-muted-foreground"> {parseInline(s.note)}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>

        {!allCorrect && (
          <Feedback tone="wrong">
            {t("kilat.swipe_some_wrong")}
          </Feedback>
        )}
      </div>
    );
  }

  const stmt = c.statements[idx];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Tag>{t("kilat.tag_swipe")}</Tag>
        <span className="text-xs text-muted-foreground tabular-nums">
          {idx + 1} / {c.statements.length}
        </span>
      </div>
      {c.prompt && (
        <p className="mb-3 text-sm text-muted-foreground">{parseInline(c.prompt)}</p>
      )}
      <div className="relative h-44">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, x: dir * 240, rotate: dir * 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="absolute inset-0 flex items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-warm"
          >
            <p className="text-lg font-semibold leading-snug">{parseInline(stmt.text)}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => judge(false)}
          className="hs-press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 text-sm font-semibold text-rose-700 dark:text-rose-300"
        >
          <ThumbsDown className="h-4 w-4" /> {t("kilat.swipe_btn_false")}
        </button>
        <button
          type="button"
          onClick={() => judge(true)}
          className="hs-press flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
        >
          <ThumbsUp className="h-4 w-4" /> {t("kilat.swipe_btn_true")}
        </button>
      </div>
    </div>
  );
}
