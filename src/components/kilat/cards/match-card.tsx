"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import type { KilatCard } from "@/types";
import { parseInline } from "@/lib/content-parser";
import { cn } from "@/lib/utils";
import { sounds } from "@/lib/sounds";
import type { KilatCardProps } from "../kilat-types";
import { Tag, seededShuffle } from "./card-bits";

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function MatchCard({ card, response, onAnswer }: KilatCardProps) {
  const c = card as Extract<KilatCard, { kind: "match" }>;
  const answered = !!response;
  const n = c.pairs.length;

  const shuffledDefs = useMemo(
    () => seededShuffle(c.pairs.map((p, i) => ({ def: p.def, oi: i })), c.id),
    [c.id, c.pairs]
  );

  // Resume / revisit: a completed match shows everything connected.
  const [matched, setMatched] = useState<Set<number>>(
    () => (answered ? new Set(c.pairs.map((_, i) => i)) : new Set())
  );
  const [selTerm, setSelTerm] = useState<number | null>(null);
  const [wrongDef, setWrongDef] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const defRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const measure = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const cb = cont.getBoundingClientRect();
    const out: Line[] = [];
    matched.forEach((ti) => {
      const p = shuffledDefs.findIndex((d) => d.oi === ti);
      const te = termRefs.current[ti];
      const de = defRefs.current[p];
      if (!te || !de) return;
      const tb = te.getBoundingClientRect();
      const db = de.getBoundingClientRect();
      out.push({
        x1: tb.right - cb.left,
        y1: tb.top + tb.height / 2 - cb.top,
        x2: db.left - cb.left,
        y2: db.top + db.height / 2 - cb.top,
      });
    });
    setLines(out);
  }, [matched, shuffledDefs]);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(cont);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const tapDef = (p: number) => {
    const oi = shuffledDefs[p].oi;
    if (answered || selTerm === null || matched.has(oi)) return;
    if (oi === selTerm) {
      sounds.correct();
      const next = new Set(matched).add(oi);
      setMatched(next);
      setSelTerm(null);
      if (next.size === n) onAnswer(true, {});
    } else {
      sounds.wrong();
      setWrongDef(p);
      setTimeout(() => setWrongDef(null), 380);
      setSelTerm(null);
    }
  };

  const allDone = matched.size === n;
  const box =
    "flex min-h-[60px] items-center rounded-xl border px-3 py-2.5 text-left text-[13px] leading-snug transition-colors";

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Link2 className="h-4 w-4" />
        </span>
        <Tag>Jodohin</Tag>
      </div>
      <h2 className="font-heading text-lg font-bold sm:text-xl">
        {c.prompt || "Pasangkan istilah dengan artinya"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Tap istilah di kiri, lalu tap arti yang cocok di kanan. Yang benar bakal kesambung garis.
      </p>

      <div ref={containerRef} className="relative mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {/* Connecting lines overlay */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {lines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Terms */}
        <div className="flex flex-col gap-2.5">
          {c.pairs.map((p, ti) => {
            const isMatched = matched.has(ti);
            const isSel = selTerm === ti;
            return (
              <button
                key={ti}
                type="button"
                ref={(el) => { termRefs.current[ti] = el; }}
                disabled={answered || isMatched}
                onClick={() => { sounds.click(); setSelTerm(ti); }}
                className={cn(
                  box,
                  "justify-center text-center font-medium",
                  isMatched
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : isSel
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/40"
                      : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="line-clamp-3">{parseInline(p.term)}</span>
              </button>
            );
          })}
        </div>

        {/* Definitions (shuffled) */}
        <div className="flex flex-col gap-2.5">
          {shuffledDefs.map((d, p) => {
            const isMatched = matched.has(d.oi);
            return (
              <button
                key={p}
                type="button"
                ref={(el) => { defRefs.current[p] = el; }}
                disabled={answered || isMatched}
                onClick={() => tapDef(p)}
                className={cn(
                  box,
                  wrongDef === p && "animate-[kilat-shake_0.38s]",
                  isMatched
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className="line-clamp-3">{parseInline(d.def)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
        {allDone ? "Semua kepasangin! Lanjut geser ke atas." : `${matched.size}/${n} cocok`}
      </p>
    </div>
  );
}
