"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ThemeId, FontId, CustomAccent } from "@/types";
import { DEFAULT_SETTINGS, THEMES, FONTS } from "@/lib/constants";
import { ensureFontLoaded, fontFamilyStack } from "@/lib/lazy-fonts";
import { accentToCss } from "@/lib/theme-init";

interface ThemeContextValue {
  dark: boolean;
  theme: ThemeId;
  font: FontId;
  customAccent: CustomAccent | null;
  setDark: (dark: boolean) => void;
  setTheme: (theme: ThemeId) => void;
  setFont: (font: FontId) => void;
  setCustomAccent: (accent: CustomAccent | null) => void;
  toggleDark: () => void;
  darkModeSchedule: {
    enabled: boolean;
    start: string;
    end: string;
  };
  setDarkModeSchedule: (schedule: {
    enabled: boolean;
    start: string;
    end: string;
  }) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

function isTimeInRange(now: Date, start: string, end: string): boolean {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight schedule (e.g., 18:00 - 06:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with defaults for SSR. The inline <script> in layout.tsx
  // already applies the correct class/attributes before React hydrates,
  // so there's no flash. We read localStorage after mount to sync React state.
  const [dark, setDarkState] = useState(DEFAULT_SETTINGS.darkMode);
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_SETTINGS.theme);
  const [font, setFontState] = useState<FontId>(DEFAULT_SETTINGS.font);
  const [customAccent, setCustomAccentState] = useState<CustomAccent | null>(null);
  const [darkModeSchedule, setDarkModeScheduleState] = useState(DEFAULT_SETTINGS.darkModeSchedule);

  // Hydrate React state from localStorage after mount
  useEffect(() => {
    setDarkState(getStoredValue("dark", DEFAULT_SETTINGS.darkMode));
    setThemeState(getStoredValue("theme", DEFAULT_SETTINGS.theme));
    setFontState(getStoredValue("font", DEFAULT_SETTINGS.font));
    setCustomAccentState(getStoredValue<CustomAccent | null>("customAccent", null));
    setDarkModeScheduleState(getStoredValue("darkModeSchedule", DEFAULT_SETTINGS.darkModeSchedule));
  }, []);

  // Apply dark mode class (runs on every dark change after mount hydration)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Apply theme data attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Apply custom VIP accent. Inline --primary beats the [data-theme] preset;
  // clearing removes the inline props so the preset primary resumes.
  useEffect(() => {
    const root = document.documentElement;
    if (customAccent) {
      const { primary, foreground } = accentToCss(customAccent);
      root.style.setProperty("--primary", primary);
      root.style.setProperty("--primary-foreground", foreground);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--primary-foreground");
    }
  }, [customAccent]);

  // Apply font
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-font", font);
    ensureFontLoaded(font);
    root.style.setProperty("--font-sans", fontFamilyStack(font));
  }, [font]);

  // Dark mode schedule check
  useEffect(() => {
    if (!darkModeSchedule.enabled) return;

    const check = () => {
      const shouldBeDark = isTimeInRange(
        new Date(),
        darkModeSchedule.start,
        darkModeSchedule.end
      );
      setDarkState(shouldBeDark);
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [darkModeSchedule]);

  const setDark = useCallback((value: boolean) => {
    setDarkState(value);
    localStorage.setItem("dark", JSON.stringify(value));
  }, []);

  const setTheme = useCallback((value: ThemeId) => {
    if (!THEMES.some((t) => t.id === value)) return;
    setThemeState(value);
    localStorage.setItem("theme", JSON.stringify(value));
  }, []);

  const setFont = useCallback((value: FontId) => {
    if (!FONTS.some((f) => f.id === value)) return;
    setFontState(value);
    localStorage.setItem("font", JSON.stringify(value));
  }, []);

  const setCustomAccent = useCallback((accent: CustomAccent | null) => {
    setCustomAccentState(accent);
    if (accent) {
      localStorage.setItem("customAccent", JSON.stringify(accent));
    } else {
      localStorage.removeItem("customAccent");
    }
  }, []);

  const toggleDark = useCallback(() => {
    setDark(!dark);
  }, [dark, setDark]);

  const setDarkModeSchedule = useCallback(
    (schedule: { enabled: boolean; start: string; end: string }) => {
      setDarkModeScheduleState(schedule);
      localStorage.setItem("darkModeSchedule", JSON.stringify(schedule));
    },
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      dark,
      theme,
      font,
      customAccent,
      setDark,
      setTheme,
      setFont,
      setCustomAccent,
      toggleDark,
      darkModeSchedule,
      setDarkModeSchedule,
    }),
    [dark, theme, font, customAccent, setDark, setTheme, setFont, setCustomAccent, toggleDark, darkModeSchedule, setDarkModeSchedule]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
