"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sounds } from "@/lib/sounds";

const FOCUS_MINUTES = 25;
const BREAK_MINUTES = 5;

type Phase = "focus" | "break";

export function PomodoroTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("focus");
  const [seconds, setSeconds] = useState(FOCUS_MINUTES * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const reset = useCallback(() => {
    sounds.toggle();
    setIsRunning(false);
    setPhase("focus");
    setSeconds(FOCUS_MINUTES * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const toggleRun = useCallback(() => {
    setIsRunning((prev) => {
      if (prev) sounds.toggle(); // pause
      else sounds.click(); // start
      return !prev;
    });
  }, []);

  // Timer tick
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          // Phase complete — play notification
          sounds.notification();
          if (phase === "focus") {
            setSessions((s) => s + 1);
            setPhase("break");
            return BREAK_MINUTES * 60;
          } else {
            setPhase("focus");
            return FOCUS_MINUTES * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, phase]);

  if (!isOpen) {
    return (
      <>
        {/* Desktop: hover expand label */}
        <button
          data-onboarding="pomodoro"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pomodoro timer"
          className="group hidden sm:flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] cursor-pointer"
        >
          <Timer className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width,opacity] group-hover:max-w-[80px] group-hover:opacity-100">
            Pomodoro
          </span>
        </button>
        {/* Mobile: simple icon */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pomodoro timer"
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
        </Button>
      </>
    );
  }

  const progress =
    phase === "focus"
      ? (FOCUS_MINUTES * 60 - seconds) / (FOCUS_MINUTES * 60)
      : (BREAK_MINUTES * 60 - seconds) / (BREAK_MINUTES * 60);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
      {/* Mini progress ring */}
      <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${progress * 62.83} 62.83`}
          className={phase === "focus" ? "text-primary" : "text-green-500"}
        />
      </svg>

      <div className="flex flex-col">
        <span className="text-xs font-mono font-semibold leading-none">
          {formatTime(seconds)}
        </span>
        <span className="text-[9px] text-muted-foreground leading-none">
          {phase === "focus" ? "Fokus" : "Istirahat"} &middot; #{sessions + 1}
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={toggleRun}
        >
          {isRunning ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={reset}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
        >
          <span className="text-xs">&times;</span>
        </Button>
      </div>
    </div>
  );
}
