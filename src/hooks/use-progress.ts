"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SubjectProgress, KilatProgress } from "@/types";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import {
  getAllProgress,
  saveAllProgress,
  calcSubjectPercent,
  mergeProgress,
} from "@/lib/progress";

const defaultProgress: SubjectProgress = {
  materi: [],
  flashcardsCompleted: false,
  quizScores: {},
};

/**
 * Progress tracking hook for a specific subject.
 * Stores in localStorage immediately, syncs to Supabase (when connected) with debounce.
 */
export function useProgress(subjectId: string) {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const licenseKey = session?.licenseKey ?? "";
  const scopeKey = scopeCtx?.scopeKey ?? "";
  const [progress, setProgress] = useState<SubjectProgress>(defaultProgress);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount (per account + scope).
  // NOTE: Server sync is handled globally by useProgressSync in AppShell.
  // We listen for the sync event to re-read localStorage when it completes.
  useEffect(() => {
    if (!licenseKey || !scopeKey) return;
    const all = getAllProgress(licenseKey, scopeKey);
    setProgress(all[subjectId] || defaultProgress);

    // Re-read when AppShell's useProgressSync completes
    const onSynced = () => {
      const refreshed = getAllProgress(licenseKey, scopeKey);
      setProgress(refreshed[subjectId] || defaultProgress);
    };
    window.addEventListener("hs-progress-synced", onSynced);
    return () => window.removeEventListener("hs-progress-synced", onSynced);
  }, [subjectId, licenseKey, scopeKey]);

  // Cleanup sync timeout on unmount
  useEffect(() => {
    return () => {
      if (syncRef.current) clearTimeout(syncRef.current);
    };
  }, []);

  const update = useCallback(
    (updater: (prev: SubjectProgress) => SubjectProgress) => {
      if (!licenseKey || !scopeKey) return;
      setProgress((prev) => {
        const next = updater(prev);
        const all = getAllProgress(licenseKey, scopeKey);
        all[subjectId] = next;
        saveAllProgress(licenseKey, scopeKey, all);

        // Notify other widgets in this tab that progress changed
        window.dispatchEvent(new Event("hs-progress-updated"));

        // Debounced sync to Supabase — only THIS scope's subtree is sent; the
        // server merges it under progress[scopeKey], never touching other scopes.
        if (syncRef.current) clearTimeout(syncRef.current);
        syncRef.current = setTimeout(async () => {
          try {
            const res = await fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scopeKey,
                settings: { progress: getAllProgress(licenseKey, scopeKey) },
              }),
            });
            const data = await res.json();
            const serverScoped = data?.settings?.progress?.[scopeKey] as
              | Record<string, SubjectProgress>
              | undefined;
            if (data?.conflict && serverScoped) {
              // Server had newer data - merge this scope's subtree and re-save
              const local = getAllProgress(licenseKey, scopeKey);
              const merged = mergeProgress(local, serverScoped);
              saveAllProgress(licenseKey, scopeKey, merged);
              window.dispatchEvent(new Event("hs-progress-synced"));
            }
          } catch {}
        }, 2000);

        return next;
      });
    },
    [subjectId, licenseKey, scopeKey]
  );

  const markMateriCompleted = useCallback(
    (materiId: number) => {
      update((prev) => ({
        ...prev,
        materi: prev.materi.includes(materiId)
          ? prev.materi
          : [...prev.materi, materiId],
      }));
    },
    [update]
  );

  const markMateriIncomplete = useCallback(
    (materiId: number) => {
      update((prev) => ({
        ...prev,
        materi: prev.materi.filter((id) => id !== materiId),
      }));
    },
    [update]
  );

  const setFlashcardsCompleted = useCallback(
    (completed: boolean) => {
      update((prev) => ({ ...prev, flashcardsCompleted: completed }));
    },
    [update]
  );

  const saveQuizScore = useCallback(
    (score: number, total: number) => {
      update((prev) => ({
        ...prev,
        quizScores: {
          ...prev.quizScores,
          [new Date().toISOString()]: { score, total },
        },
      }));
      // Note: total_quiz_score on license_keys is now recalculated
      // server-side from progress data in the PUT /api/settings handler
    },
    [update]
  );

  // Belajar Kilat: persist the whole feed state. The player accumulates state
  // in memory and calls this on meaningful events (answer, chapter clear, exit);
  // the existing 2s debounce + server merge handles sync.
  const saveKilatState = useCallback(
    (kilat: KilatProgress) => {
      update((prev) => ({ ...prev, kilat }));
    },
    [update]
  );

  const getCompletionPercent = useCallback(
    (
      totalMateri: number,
      hasFlashcards: boolean,
      hasQuiz: boolean,
      hasKilat = false
    ) =>
      calcSubjectPercent(
        progress,
        totalMateri,
        hasFlashcards,
        hasQuiz,
        hasKilat
      ),
    [progress]
  );

  return {
    progress,
    markMateriCompleted,
    markMateriIncomplete,
    setFlashcardsCompleted,
    saveQuizScore,
    saveKilatState,
    getCompletionPercent,
  };
}
