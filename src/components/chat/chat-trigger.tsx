"use client";

import { MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ChatTriggerProps {
  onClick: () => void;
  unreadCount: number;
}

export function ChatTrigger({ onClick, unreadCount }: ChatTriggerProps) {
  return (
    <Button
      data-onboarding="chat"
      onClick={onClick}
      size="icon"
      className="tts-shift-target fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg sm:bottom-6 sm:right-6"
    >
      <MessageCircle className="h-5 w-5" />

      {/* Unread badge */}
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
