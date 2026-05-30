"use client";

import { useEffect, useRef } from "react";
import { PWA_EVENTS } from "@/lib/pwa-version";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // Poll every 30 minutes (reduced from 5m to stay under Vercel free invocation limit)

/**
 * Polls /api/version to detect new deploys.
 * When the build ID changes, dispatches PWA_EVENTS.VERSION_CHANGED so the
 * update-banner can surface a "Update now" pill. We NEVER auto-reload here -
 * the user applies the update on click so in-progress drafts are never lost.
 */
export function useVersionCheck() {
  const knownBuildId = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = async () => {
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

    // Also check when tab becomes visible (user switches back to tab)
    const onVisibility = () => {
      if (!document.hidden) check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}
