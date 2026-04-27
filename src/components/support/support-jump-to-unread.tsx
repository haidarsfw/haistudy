"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

interface Props {
  count: number;
  visible: boolean;
  onClick: () => void;
}

export function SupportJumpToUnread({ count, visible, onClick }: Props) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {visible && count > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.18 }}
          onClick={onClick}
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
        >
          <ChevronDown className="h-3.5 w-3.5" />
          {t("support.jump_to_unread").replace("{count}", String(count))}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
