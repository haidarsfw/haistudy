"use client";

import { motion } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export function ExamConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDanger = false,
}: Props) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
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
          {title}
        </h3>

        <p className="mb-6 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="hs-press flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`hs-press flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              isDanger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
