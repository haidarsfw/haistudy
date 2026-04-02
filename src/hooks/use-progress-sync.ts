"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import type { SubjectProgress } from "@/types";

const STORAGE_KEY = "hs-progress";

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

        // Merge: union of server and local data (local wins for quiz scores,
        // server wins for materi completions, logical OR for flashcards)
        const raw = localStorage.getItem(STORAGE_KEY);
        const local: Record<string, SubjectProgress> = raw
          ? JSON.parse(raw)
          : {};

        const merged: Record<string, SubjectProgress> = { ...local };

        for (const [subjectId, serverSub] of Object.entries(serverProgress)) {
          const localSub = merged[subjectId] || {
            materi: [],
            flashcardsCompleted: false,
            quizScores: {},
          };
          merged[subjectId] = {
            materi: Array.from(
              new Set([...localSub.materi, ...serverSub.materi])
            ),
            flashcardsCompleted:
              localSub.flashcardsCompleted || serverSub.flashcardsCompleted,
            quizScores: {
              ...serverSub.quizScores,
              ...localSub.quizScores,
            },
          };
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

        // Dispatch event so dashboard widgets can pick up the change
        window.dispatchEvent(new Event("hs-progress-synced"));
      } catch {
        // silent — dashboard will still show local data
      }
    })();
  }, [session?.licenseKey]);
}
