"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  durationMinutes: number;
  startedAt: string;
  onWarning5?: () => void;
  onWarning1?: () => void;
  onExpired: () => void;
}

/**
 * Countdown timer for exam mode. Color transitions at thresholds.
 */
export function ExamTimer({
  durationMinutes,
  startedAt,
  onWarning5,
  onWarning1,
  onExpired,
}: Props) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    return Math.max(0, durationMinutes * 60 - elapsed);
  });

  const warned5 = useRef(false);
  const warned1 = useRef(false);
  const expired = useRef(false);

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const left = Math.max(0, durationMinutes * 60 - elapsed);
      setRemaining(left);

      if (left <= 300 && !warned5.current) {
        warned5.current = true;
        onWarning5?.();
      }
      if (left <= 60 && !warned1.current) {
        warned1.current = true;
        onWarning1?.();
      }
      if (left <= 0 && !expired.current) {
        expired.current = true;
        clearInterval(tick);
        onExpired();
      }
    }, 250);

    return () => clearInterval(tick);
  }, [durationMinutes, startedAt, onWarning5, onWarning1, onExpired]);

  const totalSeconds = Math.floor(remaining);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const display = hours >= 1
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  let colorClass = "text-foreground";
  let pulseClass = "";
  if (remaining <= 300) {
    colorClass = "text-amber-500 dark:text-amber-400";
  }
  if (remaining <= 60) {
    colorClass = "text-red-500 dark:text-red-400";
    pulseClass = "animate-pulse";
  }

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums ${colorClass} ${pulseClass}`}
      aria-live="polite"
      aria-label={`${minutes} minutes ${seconds} seconds remaining`}
    >
      <svg
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {display}
    </div>
  );
}

/**
 * Hook version for components that need the raw remaining value.
 */
export function useExamTimer(durationMinutes: number, startedAt: string) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
    return Math.max(0, durationMinutes * 60 - elapsed);
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      setRemaining(Math.max(0, durationMinutes * 60 - elapsed));
    }, 250);
    return () => clearInterval(tick);
  }, [durationMinutes, startedAt]);

  return remaining;
}
