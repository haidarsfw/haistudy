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
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className="mx-4 w-full max-w-md overflow-hidden rounded-[22px] border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Body Content */}
        <div className="p-6">
          <h3 className="mb-2 text-lg font-bold text-foreground">
            {title}
          </h3>
          <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Separator Line */}
        <div className="border-t border-border/80" />

        {/* Bottom Actions Row */}
        <div className="flex justify-end gap-3 p-4">
          <button
            type="button"
            onClick={onCancel}
            className="hs-press rounded-xl border border-border/60 bg-neutral-900/20 hover:bg-neutral-800/40 active:bg-neutral-850 px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`hs-press rounded-xl px-5 py-2 text-sm font-bold text-white transition-all duration-200 shadow-sm ${
              isDanger
                ? "bg-red-500 hover:bg-red-600 active:scale-95"
                : "bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
