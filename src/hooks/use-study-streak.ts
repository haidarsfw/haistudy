"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";

const STORAGE_KEY = "hs-study-streak";

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  activeDates: string[];
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDefaultData(): StreakData {
  return { currentStreak: 0, bestStreak: 0, lastActiveDate: null, activeDates: [] };
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    return JSON.parse(raw) as StreakData;
  } catch {
    return getDefaultData();
  }
}

function saveStreak(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
  );
}

/** Merge two streak datasets - takes the higher values */
function mergeStreaks(a: StreakData, b: StreakData): StreakData {
  // Take the one with the more recent lastActiveDate
  const aDate = a.lastActiveDate ? new Date(a.lastActiveDate).getTime() : 0;
  const bDate = b.lastActiveDate ? new Date(b.lastActiveDate).getTime() : 0;
  const latest = aDate >= bDate ? a : b;

  return {
    currentStreak: latest.currentStreak,
    bestStreak: Math.max(a.bestStreak, b.bestStreak),
    lastActiveDate: latest.lastActiveDate,
    activeDates: [
      ...new Set([...a.activeDates, ...b.activeDates]),
    ].sort().slice(-90),
  };
}

export function useStudyStreak() {
  const { session } = useSession();
  const [streak, setStreak] = useState<StreakData>(getDefaultData);
  const hasSynced = useRef(false);

  // Load from localStorage + merge with server on mount
  useEffect(() => {
    const local = loadStreak();
    setStreak(local);

    if (!session?.licenseKey || hasSynced.current) return;
    hasSynced.current = true;

    // Fetch server streak and merge
    (async () => {
      try {
        const res = await fetch(
          `/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`
        );
        const data = await res.json();
        const serverStreak = data.settings?.streak as StreakData | null;

        if (serverStreak) {
          const merged = mergeStreaks(local, serverStreak);
          saveStreak(merged);
          setStreak(merged);
        }
      } catch {
        // silent - local data is fine
      }
    })();
  }, [session?.licenseKey]);

  const recordActivity = useCallback(() => {
    const today = getTodayStr();
    const data = loadStreak();

    if (data.lastActiveDate === today) return; // Already recorded today

    let newCurrent = 1;
    if (data.lastActiveDate) {
      const diff = daysBetween(data.lastActiveDate, today);
      if (diff === 1) {
        newCurrent = data.currentStreak + 1;
      } else if (diff === 0) {
        newCurrent = data.currentStreak;
      }
    }

    const newData: StreakData = {
      currentStreak: newCurrent,
      bestStreak: Math.max(data.bestStreak, newCurrent),
      lastActiveDate: today,
      activeDates: [...new Set([...data.activeDates, today])].slice(-90),
    };

    saveStreak(newData);
    setStreak(newData);

    // Sync to server (debounced via existing settings save pipeline)
    if (session?.licenseKey) {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey: session.licenseKey,
          settings: { streak: newData },
        }),
      }).catch(() => {});
    }
  }, [session]);

  return { ...streak, recordActivity };
}
