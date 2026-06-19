"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  open: boolean;
  gracePeriodActive: boolean;
  remaining: number;
  onContinue: () => void;
  onExit: () => void;
}

/**
 * Modal confirming exit from exam mode.
 * Shows grace period info if still active.
 */
export function ExamExitModal({
  open,
  gracePeriodActive,
  remaining,
  onContinue,
  onExit,
}: Props) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onContinue}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-bold text-foreground">
          {t("exam.exit_title")}
        </h3>

        {gracePeriodActive ? (
          <p className="mb-4 text-sm text-emerald-600 dark:text-emerald-400">
            {t("exam.exit_grace")}
          </p>
        ) : (
          <p className="mb-4 text-sm text-red-500 dark:text-red-400">
            {t("exam.exit_warning").replace("{n}", String(remaining))}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="hs-press flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("exam.exit_continue")}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="hs-press flex-1 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
          >
            {t("exam.exit_leave")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
