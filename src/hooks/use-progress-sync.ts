"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { getAllProgress, saveAllProgress, mergeProgress } from "@/lib/progress";
import { whenIdle } from "@/lib/defer";
import type { SubjectProgress } from "@/types";

/**
 * Syncs study progress from server (user_settings.progress) into localStorage
 * on mount. This ensures the dashboard widgets see server-synced data even
 * when localStorage is empty (e.g. new device).
 */
export function useProgressSync() {
  const { session } = useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!session?.licenseKey || hasSynced.current) return;
    hasSynced.current = true;

    // Defer the fetch + merge until idle so it stays off the FCP path.
    return whenIdle(() => {
      (async () => {
        try {
          const res = await fetch(
            `/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`
          );
          const data = await res.json();
          const serverProgress = data.settings?.progress as
            | Record<string, SubjectProgress>
            | undefined;

          if (!serverProgress || Object.keys(serverProgress).length === 0) return;

          const local = getAllProgress();
          const merged = mergeProgress(local, serverProgress);
          saveAllProgress(merged);

          // Dispatch event so dashboard widgets can pick up the change
          window.dispatchEvent(new Event("hs-progress-synced"));
        } catch {
          // silent — dashboard will still show local data
        }
      })();
    });
  }, [session?.licenseKey]);
}
