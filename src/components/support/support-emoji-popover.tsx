"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SUPPORT_DEFAULT_REACTIONS } from "@/lib/constants";
import { SupportEmojiPicker } from "./support-emoji-picker";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** Anchor side: align bubble side. */
  side?: "left" | "right";
}

/**
 * Quick-react popup: 6 default emojis + "+" → full picker.
 * Renders inline (positioned by parent). Uses framer for entry/exit.
 */
export function SupportEmojiPopover({
  open,
  onClose,
  onPick,
  side = "left",
}: Props) {
  const [showFull, setShowFull] = useState(false);

  return (
    <AnimatePresence onExitComplete={() => setShowFull(false)}>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.96 }}
          transition={{ duration: 0.14 }}
          className={`absolute z-40 ${
            side === "right" ? "right-0" : "left-0"
          } -top-12 origin-bottom`}
          onClick={(e) => e.stopPropagation()}
        >
          {showFull ? (
            <div className="w-[280px] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
              <SupportEmojiPicker
                compact
                onSelect={(e) => {
                  onPick(e);
                  onClose();
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-0.5 rounded-full border border-border bg-popover px-1.5 py-1 shadow-lg">
              {SUPPORT_DEFAULT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onPick(emoji);
                    onClose();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
              <button
                onClick={() => setShowFull(true)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="More"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
