"use client";

import { Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AiTriggerProps {
  onClick: () => void;
  unreadCount?: number;
}

export function AiTrigger({ onClick, unreadCount = 0 }: AiTriggerProps) {
  return (
    <Button
      data-onboarding="ai"
      onClick={onClick}
      size="icon"
      variant="outline"
      aria-label="Buka AI Assistant"
      className="tts-shift-target fixed bottom-20 right-18 z-40 h-12 w-12 rounded-full border-primary/30 bg-background shadow-lg hover:bg-primary hover:text-primary-foreground sm:bottom-20 sm:right-6"
    >
      <Bot className="h-5 w-5" aria-hidden="true" />

      {/* Unread badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
