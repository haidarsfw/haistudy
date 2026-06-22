"use client";

import { useEffect, useRef } from "react";
import { PWA_EVENTS } from "@/lib/pwa-version";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // Poll every 30 minutes (reduced from 5m to stay under Vercel free invocation limit)
// Min gap between visibility-triggered checks, so rapid tab switching can't
// fire /api/version on every refocus (Vercel invocation cost).
const VISIBILITY_THROTTLE_MS = 10 * 60 * 1000;

/**
 * Polls /api/version to detect new deploys.
 * When the build ID changes, dispatches PWA_EVENTS.VERSION_CHANGED so the
 * update-banner can surface a "Update now" pill. We NEVER auto-reload here -
 * the user applies the update on click so in-progress drafts are never lost.
 */
export function useVersionCheck() {
  const knownBuildId = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    const check = async () => {
      lastCheckRef.current = Date.now();
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const remoteBuildId = data.buildId as string;

        if (!remoteBuildId || remoteBuildId === "dev") return; // skip in dev

        if (knownBuildId.current === null) {
          // First check - just record the current build ID
          knownBuildId.current = remoteBuildId;
        } else if (remoteBuildId !== knownBuildId.current) {
          // Build ID changed - new deploy detected. Surface the update banner
          // instead of reloading; user applies it when ready.
          knownBuildId.current = remoteBuildId;
          window.dispatchEvent(new Event(PWA_EVENTS.VERSION_CHANGED));
        }
      } catch {
        // Network error - ignore, will retry next interval
      }
    };

    // Initial check after a short delay (don't block page load)
    const timeout = setTimeout(check, 5000);

    // Periodic check
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);

    // Also check when tab becomes visible (user switches back to tab), but at
    // most once per VISIBILITY_THROTTLE_MS so frequent switching is free.
    const onVisibility = () => {
      if (!document.hidden && Date.now() - lastCheckRef.current >= VISIBILITY_THROTTLE_MS) {
        check();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
