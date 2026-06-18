"use client";

import { motion } from "framer-motion";
import { Table as TableIcon } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";
import type { KilatCardProps } from "../kilat-types";
import { Tag, Feedback } from "./card-bits";

function cellAlign(v: string | number) {
  return typeof v === "number" ? "text-right tabular-nums" : "text-left";
}

export function TableCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "table" }>;
  const fill = c.mode === "fill" ? c : null;
  const walk = c.mode === "walkthrough" ? c : null;
  const answered = !!response;
  const chosen = (response?.data as { selected: number } | undefined)?.selected;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <TableIcon className="h-4 w-4" />
        </span>
        <Tag>{fill ? "Isi tabel" : "Baca tabel"}</Tag>
      </div>
      {c.title && (
        <h2 className="font-heading text-lg font-bold leading-tight sm:text-xl">
          {parseInline(c.title)}
        </h2>
      )}

      <motion.div
        variants={staggerContainer(0.05)}
        initial="hidden"
        animate="visible"
        className="mt-4 overflow-hidden rounded-xl border border-border"
      >
        {c.columns && (
          <div
            className="grid bg-muted/60 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: `repeat(${c.columns.length}, minmax(0,1fr))` }}
          >
            {c.columns.map((col, i) => (
              <div key={i} className={cn("px-3 py-2", i > 0 && "text-right")}>
                {col}
              </div>
            ))}
          </div>
        )}
        {c.rows.map((row, r) => (
          <motion.div
            key={r}
            variants={staggerItem}
            className="grid border-t border-border text-sm"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))` }}
          >
            {row.map((cell, cc) => {
              const isBlank = fill ? fill.blank[0] === r && fill.blank[1] === cc : false;
              return (
                <div key={cc} className={cn("px-3 py-2", cellAlign(cell))}>
                  {isBlank && fill ? (
                    <span
                      className={cn(
                        "inline-flex min-w-[64px] items-center justify-center rounded-md border-b-2 px-2 font-semibold",
                        answered
                          ? response!.correct
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : "border-primary/50 bg-primary/5 text-primary"
                      )}
                    >
                      {answered ? (chosen !== undefined ? fill.options[chosen] : fill.options[fill.answer]) : "?"}
                    </span>
                  ) : (
                    <span>{typeof cell === "string" ? parseInline(cell) : cell}</span>
                  )}
                </div>
              );
            })}
          </motion.div>
        ))}
      </motion.div>

      {/* Walkthrough notes */}
      {walk?.notes && walk.notes.length > 0 && (
        <div className="mt-3 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {walk.notes.map((n, i) => (
            <p key={i} className="flex gap-2">
              <span className="text-primary">-</span>
              <span>{parseInline(n)}</span>
            </p>
          ))}
        </div>
      )}

      {/* Fill options */}
      {fill && !answered && (
        <div className="mt-4 flex flex-wrap gap-2">
          {fill.options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onAnswer(idx === fill.answer, { selected: idx })}
              className="hs-press rounded-full border border-border bg-card px-4 py-2 font-mono text-sm font-medium hover:border-primary/40 hover:bg-primary/5"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {fill && answered && (
        <Feedback tone={response!.correct ? "correct" : "wrong"}>
          {response!.correct ? (
            parseInline(fill.explain)
          ) : (
            <>
              Yang benar: <b className="font-mono">{fill.options[fill.answer]}</b>. {parseInline(fill.explain)}
            </>
          )}
        </Feedback>
      )}
    </div>
  );
}
