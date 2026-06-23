"use client";

import { createContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { UserSettings } from "@/types";

const SETTINGS_KEY = "hs-settings";
const DEBOUNCE_MS = 3000;
const SETTINGS_SYNC_EVENT = "hs-settings-changed";

function getLocalSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return JSON.parse(stored);

    const dark = localStorage.getItem("dark");
    const theme = localStorage.getItem("theme");
    const font = localStorage.getItem("font");
    if (dark !== null || theme !== null || font !== null) {
      return {
        ...DEFAULT_SETTINGS,
        darkMode: dark !== null ? JSON.parse(dark) : DEFAULT_SETTINGS.darkMode,
        theme: theme !== null ? JSON.parse(theme) : DEFAULT_SETTINGS.theme,
        font: font !== null ? JSON.parse(font) : DEFAULT_SETTINGS.font,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function saveLocalSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem("hs-settings-updated", new Date().toISOString());
}

interface SettingsContextValue {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  updateSettings: (updates: Partial<UserSettings>) => void;
  refetch: () => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { dark, theme, font, customAccent, setDark, setTheme, setFont, setCustomAccent, setDarkModeSchedule } = useTheme();
  const [settings, setSettingsState] = useState<UserSettings>(
    () => getLocalSettings() || { ...DEFAULT_SETTINGS, selectedClass: session?.selectedClass || "" }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedAtRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const selfTriggeredRef = useRef(false);

  // Apply ALL settings to ThemeProvider
  const applyToTheme = useCallback(
    (s: UserSettings) => {
      setDark(s.darkMode);
      setTheme(s.theme);
      setFont(s.font);
      setCustomAccent(s.customAccent ?? null);
      setDarkModeSchedule(s.darkModeSchedule);
    },
    [setDark, setTheme, setFont, setCustomAccent, setDarkModeSchedule]
  );

  // Keep settings state synced with ThemeProvider for header/landing toggles
  useEffect(() => {
    setSettingsState((prev) => {
      const accentEq =
        (prev.customAccent ?? null) === (customAccent ?? null) ||
        (!!prev.customAccent && !!customAccent &&
          prev.customAccent.h === customAccent.h &&
          prev.customAccent.s === customAccent.s &&
          prev.customAccent.l === customAccent.l);
      if (prev.darkMode === dark && prev.theme === theme && prev.font === font && accentEq) return prev;
      const next = { ...prev, darkMode: dark, theme, font, customAccent: customAccent ?? null };
      saveLocalSettings(next);
      return next;
    });
  }, [dark, theme, font, customAccent]);

  // Debounced save to server
  const saveToServer = useCallback(
    async (s: UserSettings) => {
      if (!session) return;
      setIsSaving(true);
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            settings: s,
            updatedAt: updatedAtRef.current,
          }),
        });
        const data = await res.json();
        if (data.updatedAt) {
          updatedAtRef.current = data.updatedAt;
          localStorage.setItem("hs-settings-updated", data.updatedAt);
        }
      } catch (error) {
        console.error("Failed to save settings:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [session]
  );

  // Fetch settings from server
  const fetchSettings = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      isInitializedRef.current = true;
      return;
    }
    try {
      // Flush any pending debounced save first so server has latest data
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        const pendingSettings = getLocalSettings();
        if (pendingSettings) {
          await saveToServer(pendingSettings);
        }
      }

      const res = await fetch(
        `/api/settings?licenseKey=${encodeURIComponent(session.licenseKey)}`
      );
      const data = await res.json();

      if (data.settings) {
        const localSettings = getLocalSettings();
        const localUpdatedAt = localStorage.getItem("hs-settings-updated");
        const serverHasData = !!data.updatedAt;
        const serverIsNewer =
          serverHasData &&
          (!localUpdatedAt ||
            new Date(data.updatedAt) > new Date(localUpdatedAt));

        if (serverIsNewer) {
          // Server has newer data (cross-device sync) - apply everything
          setSettingsState(data.settings);
          saveLocalSettings(data.settings);
          setTimeout(() => applyToTheme(data.settings), 0);
        } else if (!localSettings && serverHasData) {
          // No local settings at all and server has real data - first load
          setSettingsState(data.settings);
          saveLocalSettings(data.settings);
          setTimeout(() => applyToTheme(data.settings), 0);
        }
        updatedAtRef.current = data.updatedAt;
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setIsLoading(false);
      isInitializedRef.current = true;
    }
  }, [session, applyToTheme, saveToServer]);

  // Fetch on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a specific setting
  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...updates };
        saveLocalSettings(next);

        // Schedule debounced save
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveToServer(next), DEBOUNCE_MS);

        // Broadcast to other tabs
        selfTriggeredRef.current = true;
        window.dispatchEvent(
          new CustomEvent(SETTINGS_SYNC_EVENT, { detail: next })
        );

        return next;
      });

      if ("darkMode" in updates) setDark(updates.darkMode!);
      if ("theme" in updates) setTheme(updates.theme!);
      if ("font" in updates) setFont(updates.font!);
      if ("customAccent" in updates) setCustomAccent(updates.customAccent ?? null);
      if ("darkModeSchedule" in updates) setDarkModeSchedule(updates.darkModeSchedule!);
    },
    [saveToServer, setDark, setTheme, setFont, setCustomAccent, setDarkModeSchedule]
  );

  // Cross-tab/instance sync
  useEffect(() => {
    const handler = (e: Event) => {
      if (selfTriggeredRef.current) {
        selfTriggeredRef.current = false;
        return;
      }
      const incoming = (e as CustomEvent).detail as UserSettings;
      queueMicrotask(() => {
        setSettingsState(incoming);
        applyToTheme(incoming);
      });
    };
    window.addEventListener(SETTINGS_SYNC_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_SYNC_EVENT, handler);
  }, [applyToTheme]);

  // NOTE: We intentionally do NOT subscribe to user_settings over Realtime.
  // user_settings has default (PK-only) replica identity, so a
  // `filter: license_key=...` postgres_changes binding is rejected by Postgres
  // ("invalid column for filter license_key") and the client library retries
  // forever — for EVERY logged-in user. That retry storm flooded Supabase (WAL
  // + subscription churn) and was a primary cause of free-tier downtime.
  // Settings still load on mount + refetch; cross-device changes appear on the
  // next load instead of live. See also: user_settings removed from the
  // realtime publication (migration 056).

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        isSaving,
        updateSettings,
        refetch: fetchSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
