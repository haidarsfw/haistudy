"use client";

import { Fragment } from "react";
import { Check, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/language-provider";
import { Wordmark } from "@/components/landing/logo";

/**
 * Comparison — haistudy vs "Produk lain" (resells last year's notes raw from a
 * Drive folder, per course) vs "AI umum" (generic chatbots).
 *
 * The whole table lives inside one rounded outer card (the only part borrowed
 * from the reference); the haistudy column is marked by a soft tint + gradient
 * wordmark + badge, no boxed inner outline, no header icons. Zebra rows +
 * shape-in-a-circle verdicts (Check / Minus / X + sr-only + legend) keep it
 * colourblind safe and easy on the eyes.
 */

type V = "yes" | "partial" | "no";
type Col = "lain" | "ai" | "hai";

interface Row {
  labelKey: string;
  text?: boolean; // optional text row (e.g. harga) instead of a verdict
  lain: V | string;
  ai: V | string;
  hai: V | string;
}

const ROWS: Row[] = [
  { labelKey: "landing.compare.r_materi", lain: "partial", ai: "no", hai: "yes" },
  { labelKey: "landing.compare.r_kisi", lain: "partial", ai: "no", hai: "yes" },
  { labelKey: "landing.compare.r_ready", lain: "partial", ai: "no", hai: "yes" },
  { labelKey: "landing.compare.r_features", lain: "no", ai: "partial", hai: "yes" },
  { labelKey: "landing.compare.r_latihan", lain: "no", ai: "partial", hai: "yes" },
  { labelKey: "landing.compare.r_ai", lain: "no", ai: "no", hai: "yes" },
  { labelKey: "landing.compare.r_komunitas", lain: "no", ai: "no", hai: "yes" },
  {
    labelKey: "landing.compare.r_harga",
    text: true,
    lain: "landing.compare.harga_lain",
    ai: "landing.compare.harga_ai",
    hai: "landing.compare.harga_hai",
  },
];

// Left → right; haistudy last = rightmost.
const COLS: Col[] = ["lain", "ai", "hai"];

export function Comparison() {
  const { t } = useTranslation();

  function Verdict({ v }: { v: V }) {
    const label = t(
      v === "yes"
        ? "landing.compare.legend_yes"
        : v === "partial"
          ? "landing.compare.legend_partial"
          : "landing.compare.legend_no"
    );
    const ring =
      v === "yes" ? "bg-emerald-500/15" : v === "partial" ? "bg-amber-500/15" : "bg-muted";
    const Icon = v === "yes" ? Check : v === "partial" ? Minus : X;
    const color =
      v === "yes"
        ? "text-emerald-500"
        : v === "partial"
          ? "text-amber-500"
          : "text-muted-foreground/45";
    return (
      <span
        className={cn("flex h-6 w-6 items-center justify-center rounded-full", ring)}
        role="img"
        aria-label={label}
      >
        <Icon className={cn("h-3.5 w-3.5", color)} aria-hidden="true" strokeWidth={2.5} />
      </span>
    );
  }

  function Cell({ row, col }: { row: Row; col: Col }) {
    const value = row[col];
    if (row.text) {
      return (
        <span
          className={cn(
            "text-xs",
            col === "hai" ? "font-bold text-foreground" : "font-medium text-muted-foreground"
          )}
        >
          {t(value)}
        </span>
      );
    }
    return <Verdict v={value as V} />;
  }

  return (
    <section id="banding" className="scroll-mt-24 px-4 pb-8 pt-4 sm:pb-10 sm:pt-6">
      <div className="mx-auto max-w-4xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.compare.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            {t("landing.compare.subtitle")}
          </p>
        </div>

        <div data-reveal className="mt-10" style={{ transitionDelay: "80ms" }}>
          {/* outer card — the one thing kept from the reference */}
          <div className="overflow-hidden rounded-3xl border border-border bg-background/90 shadow-card">
            <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
              {/* ── header ── */}
              <div className="flex items-end border-b border-border/50 px-4 pb-3 pt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {t("landing.compare.col_feature")}
                </span>
              </div>
              <div className="flex items-end justify-center border-b border-border/50 px-2 pb-3 pt-5 text-center text-sm font-semibold text-muted-foreground">
                {t("landing.compare.col_lain")}
              </div>
              <div className="flex items-end justify-center border-b border-border/50 px-2 pb-3 pt-5 text-center text-sm font-semibold text-muted-foreground">
                {t("landing.compare.col_ai")}
              </div>
              <div className="flex flex-col items-center justify-end gap-1.5 border-b border-border/50 px-2 pb-3 pt-3">
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  {t("landing.compare.badge")}
                </span>
                <Wordmark className="text-base" />
              </div>

              {/* ── rows (zebra) ── */}
              {ROWS.map((row, ri) => {
                const zebra = ri % 2 === 1;
                const last = ri === ROWS.length - 1;
                return (
                  <Fragment key={row.labelKey}>
                    <div
                      className={cn(
                        "flex items-center py-3.5 pl-4 pr-2 text-left text-[13px] leading-tight text-foreground",
                        !last && "border-b border-border/40",
                        zebra && "bg-muted/20"
                      )}
                    >
                      {t(row.labelKey)}
                    </div>
                    {COLS.map((col) => (
                      <div
                        key={col}
                        className={cn(
                          "flex items-center justify-center px-2 py-3.5",
                          !last && "border-b border-border/40",
                          zebra && "bg-muted/20"
                        )}
                      >
                        <Cell row={row} col={col} />
                      </div>
                    ))}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* legend — verdicts read by shape, not colour alone */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} aria-hidden="true" />
              {t("landing.compare.legend_yes")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Minus className="h-3.5 w-3.5 text-amber-500" strokeWidth={2.5} aria-hidden="true" />
              {t("landing.compare.legend_partial")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <X className="h-3.5 w-3.5 text-muted-foreground/45" strokeWidth={2.5} aria-hidden="true" />
              {t("landing.compare.legend_no")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
