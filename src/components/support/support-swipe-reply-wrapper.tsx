"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Reply } from "lucide-react";

interface Props {
  children: ReactNode;
  onReply: () => void;
  /** Disable wrapper entirely (e.g. system messages). */
  disabled?: boolean;
}

/**
 * Touch-only swipe-right-to-reply wrapper.
 * Drag horizontally; if released past threshold, triggers onReply.
 * Always renders children unchanged on hover-capable devices (desktops).
 */
export function SupportSwipeReplyWrapper({ children, onReply, disabled }: Props) {
  const [touchOnly, setTouchOnly] = useState(false);
  const x = useMotionValue(0);
  const indicatorOpacity = useTransform(x, [0, 60], [0, 1]);
  const indicatorScale = useTransform(x, [0, 60], [0.6, 1]);

  useEffect(() => {
    // (hover: hover) is true for mice; false for touch-only devices
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(hover: none) and (pointer: coarse)");
    setTouchOnly(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setTouchOnly(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (!touchOnly || disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full min-w-0 overflow-hidden" style={{ touchAction: "pan-y" }}>
      {/* Reply indicator behind */}
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale }}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Reply className="h-3.5 w-3.5" />
        </div>
      </motion.div>

      <motion.div
        drag="x"
        dragDirectionLock
        dragElastic={0.18}
        dragConstraints={{ left: 0, right: 80 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 50) {
            onReply();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
