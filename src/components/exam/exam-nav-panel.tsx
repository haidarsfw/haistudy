"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, List } from "lucide-react";
import type { ExamAnswerSlot } from "@/types/exam";
import { useTranslation } from "@/components/providers/language-provider";

type SlotStatus = "empty" | "partial" | "answered";

interface Props {
  slots: ExamAnswerSlot[];
  /** Precomputed answered status per slot (parallel to slots). */
  statuses: SlotStatus[];
  currentIndex: number;
  onJump: (index: number) => void;
}

const statusColors: Record<SlotStatus, string> = {
  empty: "border-border bg-card text-muted-foreground",
  partial:
    "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  answered:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
};

/**
 * Navigation sidebar (desktop) / bottom sheet FAB (mobile) for jumping
 * between exam questions. Groups by section (Type I/II/III) and shows each
 * slot's answered status from the parent player.
 */
export function ExamNavPanel({ slots, statuses, currentIndex, onJump }: Props) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const answered = statuses.filter((s) => s === "answered").length;

  const navContent = (
    <div className="space-y-1.5">
      {slots.map((slot, i) => {
        const showSection = i === 0 || slots[i - 1].section !== slot.section;
        const status = statuses[i] ?? "empty";
        const isCurrent = i === currentIndex;

        return (
          <div key={slot.questionId}>
            {showSection && (
              <p className="mb-1 mt-3 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground first:mt-0">
                {slot.section}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                onJump(i);
                setMobileOpen(false);
              }}
              className={`hs-press flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-all ${
                isCurrent
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                  : statusColors[status]
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
                {slot.label}
              </span>
              <span className="truncate">Soal {slot.label}</span>
              {status === "answered" && (
                <span className="ml-auto text-emerald-500">✓</span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden w-44 shrink-0 overflow-y-auto border-r border-border bg-card/50 p-3 md:block">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          {t("exam.nav_panel")}
        </p>
        <p className="mb-3 text-[10px] text-muted-foreground">
          {answered}/{slots.length} {t("exam.progress")}
        </p>
        {navContent}
      </div>

      {/* Mobile FAB */}
      <div className="fixed bottom-20 left-4 z-[95] md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="hs-press flex h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold shadow-lg"
        >
          <List className="h-4 w-4" />
          {answered}/{slots.length}
          <ChevronRight
            className={`h-3 w-3 transition-transform ${mobileOpen ? "rotate-90" : ""}`}
          />
        </button>
      </div>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[96] bg-black/40 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-x-0 bottom-0 z-[97] max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 md:hidden"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <p className="mb-2 text-sm font-semibold">{t("exam.nav_panel")}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {answered}/{slots.length} {t("exam.progress")}
              </p>
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
