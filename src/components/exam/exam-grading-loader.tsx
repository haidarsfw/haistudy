"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import type { ExamData } from "@/types/exam";

export interface GradingUnit {
  /** Short unit code shown to the user, e.g. "1", "5a". */
  code: string;
  /** Section heading (Type I / II ...) without the "(...)" suffix. */
  section: string;
}

/**
 * Flat, ordered list of every answerable unit (essay, sub-question, T/F
 * statement) — same numbering the results screen uses. Drives the grading
 * loader's cycling "now grading" label + the time estimate.
 */
export function buildGradingUnits(
  exam: ExamData,
  lang: "en" | "id"
): GradingUnit[] {
  const units: GradingUnit[] = [];
  exam.questions.forEach((q, i) => {
    const section = q.sectionLabel[lang].split("(")[0].trim();
    if (q.subQuestions && q.subQuestions.length > 0) {
      q.subQuestions.forEach((s, j) => {
        units.push({ code: `${i + 1}${String.fromCharCode(97 + j)}`, section });
      });
    } else {
      units.push({ code: `${i + 1}`, section });
    }
  });
  return units;
}

// Estimated grading time per unit (seconds). Real grading runs chunks of ~4
// units concurrently, so this is paced a touch slower than reality on purpose:
// the bar eases toward 95% and the parent unmounts the loader the instant the
// real result lands (so 100% always means "actually done", never a false one).
const SEC_PER_UNIT = 6;
const MIN_TOTAL_SEC = 12;
const TICK_MS = 250;

interface ExamGradingLoaderProps {
  /** Ordered answerable units; enables the progress bar + ETA + unit cycling. */
  units?: GradingUnit[];
  /** Heading override (e.g. re-grade). Defaults to exam.grading_title. */
  title?: string;
  /** "fullscreen" (submit) paints the whole screen; "overlay" (regrade) scrims. */
  variant?: "fullscreen" | "overlay";
}

/**
 * Loading screen shown while AI grades the exam (submit) or re-grades a saved
 * attempt (regrade). Shows an estimated progress bar, the unit currently being
 * graded, and an estimated time remaining so the wait feels purposeful.
 */
export function ExamGradingLoader({
  units = [],
  title,
  variant = "fullscreen",
}: ExamGradingLoaderProps) {
  const { t } = useTranslation();
  const total = units.length;
  const estTotalMs = Math.max(MIN_TOTAL_SEC, total * SEC_PER_UNIT) * 1000;

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    // setState inside a timer callback (not the effect body) — fine under the
    // set-state-in-effect rule, and 250ms keeps re-renders light.
    const id = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Asymptotic ease toward the cap: the bar rises quickly at the start, then
  // keeps creeping so it never freezes at "almost done" when grading runs long.
  // (Never claims 100% — the parent swaps to the results screen on success.)
  const CAP = 96;
  const tau = estTotalMs * 0.55;
  const pct = Math.min(CAP, Math.round(CAP * (1 - Math.exp(-elapsed / tau))));
  const remainingSec = Math.max(0, Math.ceil((estTotalMs - elapsed) / 1000));
  const unitIdx =
    total > 0
      ? Math.min(total - 1, Math.floor(elapsed / (SEC_PER_UNIT * 1000)))
      : -1;
  const unit = unitIdx >= 0 ? units[unitIdx] : null;

  const containerClass =
    variant === "overlay"
      ? "fixed inset-0 z-[110] flex flex-col items-center justify-center gap-5 bg-background/85 px-8 backdrop-blur-sm"
      : "fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background px-8";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={containerClass}
    >
      {/* Animated icon */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5"
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </motion.div>

      <div className="text-center">
        <h2 className="mb-1 text-xl font-bold text-foreground">
          {title ?? t("exam.grading_title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("exam.grading_subtitle")}
        </p>
      </div>

      {/* Progress bar + live status (when the unit list is known) */}
      {total > 0 ? (
        <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between gap-2 text-xs font-medium">
            <span className="truncate text-foreground">
              {unit
                ? `${t("exam.grading_now")}: ${t("exam.grading_unit").replace(
                    "{code}",
                    unit.code
                  )} · ${unit.section}`
                : t("exam.grading_now")}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {Math.min(unitIdx + 1, total)}/{total}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${pct}%` }}
              transition={{ ease: "easeOut", duration: 0.4 }}
            />
          </div>

          <p className="mt-2 text-center text-xs tabular-nums text-muted-foreground">
            {remainingSec > 0
              ? t("exam.grading_eta").replace("{s}", String(remainingSec))
              : t("exam.grading_almost")}
          </p>
        </div>
      ) : (
        /* No unit list → fall back to the original animated dots. */
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
