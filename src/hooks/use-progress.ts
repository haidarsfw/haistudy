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

  // Load on mount + merge from server
  useEffect(() => {
    const all = getAllProgress();
    setProgress(all[subjectId] || defaultProgress);

    // Sync from server on mount
    if (session?.licenseKey) {
      fetch(`/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.settings?.progress) {
            const serverProgress = data.settings.progress as Record<string, SubjectProgress>;
            const serverSubject = serverProgress[subjectId];
            if (serverSubject) {
              const localAll = getAllProgress();
              const localSubject = localAll[subjectId] || defaultProgress;
              // Merge: server wins for fields with more data
              const merged: SubjectProgress = {
                materi: Array.from(
                  new Set([...localSubject.materi, ...serverSubject.materi])
                ),
                flashcardsCompleted:
                  localSubject.flashcardsCompleted || serverSubject.flashcardsCompleted,
                quizScores: {
                  ...serverSubject.quizScores,
                  ...localSubject.quizScores,
                },
              };
              localAll[subjectId] = merged;
              saveAllProgress(localAll);
              setProgress(merged);
            }
          }
        })
        .catch(() => {});
    }
  }, [subjectId, session?.licenseKey]);

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
