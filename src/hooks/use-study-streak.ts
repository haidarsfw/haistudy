"use client";

import { useState, useEffect, useCallback } from "react";

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

export function useStudyStreak() {
  const [streak, setStreak] = useState<StreakData>(getDefaultData);

  useEffect(() => {
    setStreak(loadStreak());
  }, []);

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
  }, []);

  return { ...streak, recordActivity };
}
