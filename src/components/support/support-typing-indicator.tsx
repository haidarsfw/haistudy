"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/components/providers/language-provider";
import type { SupportTypingState } from "@/types";

interface Props {
  typing: SupportTypingState | null;
}

export function SupportTypingIndicator({ typing }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {typing?.isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-2 px-3 pb-2"
          aria-live="polite"
        >
          <div className="flex items-center gap-1 rounded-2xl bg-muted px-3 py-2 shadow-sm">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.32s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.16s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
          <span className="text-[10px] text-muted-foreground italic">
            {typing.fromName ? `${typing.fromName} ${t("support.typing")}` : t("support.typing")}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
