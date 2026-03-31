"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import type { UserSettings } from "@/types";

const SETTINGS_KEY = "hs-settings";
const DEBOUNCE_MS = 1000;
const SETTINGS_SYNC_EVENT = "hs-settings-changed";

function getLocalSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveLocalSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  localStorage.setItem("hs-settings-updated", new Date().toISOString());
}

/**
 * Settings hook: localStorage immediate + debounced Supabase save + Realtime sync.
 * Integrates with ThemeProvider for appearance changes.
 */
export function useSettings() {
  const { session } = useSession();
  const { setDark, setTheme, setFont, setDarkModeSchedule } = useTheme();
  const [settings, setSettingsState] = useState<UserSettings>(
    () => getLocalSettings() || { ...DEFAULT_SETTINGS, selectedClass: session?.selectedClass || "" }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedAtRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const selfTriggeredRef = useRef(false);

  // Apply settings to ThemeProvider
  const applyToTheme = useCallback(
    (s: UserSettings) => {
      setDark(s.darkMode);
      setTheme(s.theme);
      setFont(s.font);
      setDarkModeSchedule(s.darkModeSchedule);
    },
    [setDark, setTheme, setFont, setDarkModeSchedule]
  );

  // Debounced save to server (must be before fetchSettings to avoid TDZ)
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
    if (!session) return;
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
        setSettingsState(data.settings);
        saveLocalSettings(data.settings);
        setTimeout(() => applyToTheme(data.settings), 0);
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

  // Update a specific setting - broadcasts to all hook instances via CustomEvent
  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      const next = { ...settings, ...updates };
      setSettingsState(next);
      saveLocalSettings(next);

      // Debounced save to server
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => saveToServer(next), DEBOUNCE_MS);

      // Broadcast to other useSettings instances in this tab
      selfTriggeredRef.current = true;
      window.dispatchEvent(
        new CustomEvent(SETTINGS_SYNC_EVENT, { detail: next })
      );
    },
    [settings, saveToServer]
  );

  // Apply appearance to ThemeProvider via useEffect - NOT inside setState updater
  // This prevents "Cannot update component while rendering" (C3 fix)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    applyToTheme(settings);
  }, [settings.darkMode, settings.theme, settings.font, settings.darkModeSchedule, applyToTheme]);

  // Cross-instance sync: listen for settings changes from other useSettings() instances
  useEffect(() => {
    const handler = (e: Event) => {
      if (selfTriggeredRef.current) {
        selfTriggeredRef.current = false;
        return; // Skip - this instance originated the change
      }
      const incoming = (e as CustomEvent).detail as UserSettings;
      setSettingsState(incoming);
      applyToTheme(incoming);
    };
    window.addEventListener(SETTINGS_SYNC_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_SYNC_EVENT, handler);
  }, [applyToTheme]);

  // Supabase Realtime subscription for cross-device sync
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`settings-${session.licenseKey}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_settings",
          filter: `license_key=eq.${session.licenseKey}`,
        },
        (payload) => {
          const row = payload.new;
          // Only apply if from another device (check updated_at)
          const serverUpdated = row.updated_at;
          const localUpdated = localStorage.getItem("hs-settings-updated");

          if (
            serverUpdated &&
            localUpdated &&
            new Date(serverUpdated) > new Date(localUpdated)
          ) {
            const incoming: UserSettings = {
              darkMode: row.dark_mode ?? DEFAULT_SETTINGS.darkMode,
              theme: row.theme ?? DEFAULT_SETTINGS.theme,
              font: row.font ?? DEFAULT_SETTINGS.font,
              language: row.language ?? DEFAULT_SETTINGS.language,
              selectedClass: row.selected_class ?? "",
              reminder: row.reminder ?? null,
              hideStatus: row.hide_status ?? false,
              hideStatusChangedAt: row.hide_status_changed_at ?? null,
              darkModeSchedule:
                row.dark_mode_schedule ?? DEFAULT_SETTINGS.darkModeSchedule,
              progress: row.progress ?? {},
            };
            setSettingsState(incoming);
            saveLocalSettings(incoming);
            applyToTheme(incoming);
            updatedAtRef.current = serverUpdated;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, applyToTheme]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    refetch: fetchSettings,
  };
}
