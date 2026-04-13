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

  const resetTimers = useCallback(() => {
    lastResetRef.current = Date.now();
    setShowWarning(false);

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

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
  }, [session?.licenseKey, logout, router]);

  useEffect(() => {
    if (!session) return;

    resetTimers();

    const events = ["mousedown", "keydown", "scroll", "touchstart"];

    // Debounce: only reset timer every 30 seconds to avoid excessive resets
    const onActivity = () => {
      const now = Date.now();
      if (now - lastResetRef.current > 30_000) {
        resetTimers();
      }
    };

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [session, resetTimers]);

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
