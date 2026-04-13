"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { SubjectProgress } from "@/types";
import { useSession } from "@/components/providers/session-provider";

const STORAGE_KEY = "hs-progress";

function getAllProgress(): Record<string, SubjectProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllProgress(progress: Record<string, SubjectProgress>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

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
  const [progress, setProgress] = useState<SubjectProgress>(defaultProgress);
  const syncRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage on mount.
  // NOTE: Server sync is handled globally by useProgressSync in AppShell.
  // We listen for the sync event to re-read localStorage when it completes.
  useEffect(() => {
    const all = getAllProgress();
    setProgress(all[subjectId] || defaultProgress);

    // Re-read when AppShell's useProgressSync completes
    const onSynced = () => {
      const refreshed = getAllProgress();
      setProgress(refreshed[subjectId] || defaultProgress);
    };
    window.addEventListener("hs-progress-synced", onSynced);
    return () => window.removeEventListener("hs-progress-synced", onSynced);
  }, [subjectId]);

  // Cleanup sync timeout on unmount
  useEffect(() => {
    return () => {
      if (syncRef.current) clearTimeout(syncRef.current);
    };
  }, []);

  const update = useCallback(
    (updater: (prev: SubjectProgress) => SubjectProgress) => {
      setProgress((prev) => {
        const next = updater(prev);
        const all = getAllProgress();
        all[subjectId] = next;
        saveAllProgress(all);

        // Debounced sync to Supabase
        if (session?.licenseKey) {
          if (syncRef.current) clearTimeout(syncRef.current);
          syncRef.current = setTimeout(async () => {
            try {
              await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  licenseKey: session.licenseKey,
                  settings: { progress: getAllProgress() },
                }),
              });
            } catch {}
          }, 2000);
        }

        return next;
      });
    },
    [subjectId]
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

      // Sync quiz score to license key for admin stats
      if (session?.licenseKey) {
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            incrementQuizScore: Math.round(score),
          }),
        }).catch(() => {});
      }
    },
    [update, session]
  );

  // Calculate completion percentage
  const getCompletionPercent = useCallback(
    (totalMateri: number, hasFlashcards: boolean, hasQuiz: boolean) => {
      let sections = 0;
      let completed = 0;

      // Materi completion
      if (totalMateri > 0) {
        sections++;
        completed += progress.materi.length / totalMateri;
      }

      // Flashcards
      if (hasFlashcards) {
        sections++;
        if (progress.flashcardsCompleted) completed += 1;
      }

      // Quiz (any attempt counts)
      if (hasQuiz) {
        sections++;
        if (Object.keys(progress.quizScores).length > 0) completed += 1;
      }

      return sections > 0 ? Math.round((completed / sections) * 100) : 0;
    },
    [progress]
  );

  return {
    progress,
    markMateriCompleted,
    markMateriIncomplete,
    setFlashcardsCompleted,
    saveQuizScore,
    getCompletionPercent,
  };
}
