"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { getDeviceId } from "@/lib/auth/device";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from "@/lib/constants";

/**
 * Session timeout tracker.
 * Shows warning at 25min, auto-logout at 30min of inactivity.
 * Uses 30-second debounce to prevent excessive timer resets.
 */
export function SessionTimeout() {
  const router = useRouter();
  const { session, logout } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const lastResetRef = useRef(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Paused while an exam/grading/results screen is up (#15) — long reading or
  // typing without qualifying events must never log the user out mid-attempt.
  const examActiveRef = useRef(false);

  // Google (email) logins never idle-out — only license keys carry the 30-day
  // activation + idle-timeout model. Preview sessions are exempt too.
  const idleEnabled =
    !!session && session.loginMethod !== "email" && !session.isPreview;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    lastResetRef.current = Date.now();
    setShowWarning(false);
    clearTimers();

    // While an exam is active the timers stay paused (no auto-logout).
    if (examActiveRef.current) return;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, SESSION_WARNING_MS);

    logoutTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ licenseKey: session?.licenseKey, deviceId: getDeviceId() }),
        });
      } catch {
        // Continue anyway
      }
      logout();
      router.push("/login");
    }, SESSION_TIMEOUT_MS);
  }, [session?.licenseKey, logout, router, clearTimers]);

  useEffect(() => {
    if (!idleEnabled) {
      clearTimers();
      return;
    }

    resetTimers();

    // Broad activity set + bubbling-friendly events so reading/scrolling inner
    // panels still counts (scroll doesn't bubble, so include pointer/mouse move).
    const events = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
      "pointerdown",
      "click",
      "wheel",
    ];

    // Debounce: only reset every 30s to avoid excessive resets.
    const onActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current > 30_000) {
        resetTimers();
      }
    };

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Exam player broadcasts its active state; pause/resume the idle timers.
    const onExam = (e: Event) => {
      examActiveRef.current = (e as CustomEvent).detail === true;
      resetTimers();
    };
    window.addEventListener("hs:exam-active", onExam as EventListener);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("hs:exam-active", onExam as EventListener);
      clearTimers();
    };
  }, [idleEnabled, resetTimers, clearTimers]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-x-0 top-14 z-50 flex items-center justify-center px-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm text-amber-800 shadow-lg dark:border-amber-400/20 dark:bg-amber-950/50 dark:text-amber-200">
        Sesi akan berakhir dalam 5 menit karena tidak ada aktivitas.{" "}
        <button
          onClick={resetTimers}
          className="font-semibold underline hover:no-underline"
        >
          Tetap masuk
        </button>
      </div>
    </div>
  );
}
