"use client";

import { motion } from "framer-motion";
import { useTranslation } from "@/components/providers/language-provider";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";

interface Props {
  open: boolean;
  answered: number;
  total: number;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * Submit confirmation modal. Shows how many questions are answered
 * and warns about empty answers receiving 0 points.
 */
export function ExamSubmitModal({
  open,
  answered,
  total,
  onSubmit,
  onBack,
}: Props) {
  const { t } = useTranslation();
  // Esc / click-outside = "back" (don't submit yet — the safe action).
  const dialogRef = useDialogA11y<HTMLDivElement>(open, onBack);
  if (!open) return null;

  const empty = total - answered;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onBack}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-submit-title"
        tabIndex={-1}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="exam-submit-title" className="mb-2 text-lg font-bold text-foreground">
          {t("exam.submit_title")}
        </h3>

        <p className="mb-2 text-sm text-muted-foreground">
          {t("exam.submit_status")
            .replace("{n}", String(answered))
            .replace("{total}", String(total))
            .replace("{empty}", String(empty))}
        </p>

        {empty > 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
            ⚠️ {t("exam.submit_empty_warn")}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="hs-press flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            {t("exam.submit_back")}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="hs-press flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t("exam.submit_confirm")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
