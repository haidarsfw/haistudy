"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
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

    // Fallback: read from ThemeProvider's individual keys.
    // This covers users who changed theme via toggle but never opened Settings,
    // so the hs-settings bundle was never written.
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

/**
 * Settings hook: localStorage immediate + debounced Supabase save + Realtime sync.
 * Integrates with ThemeProvider for appearance changes.
 */
export function useSettings() {
  const { session } = useSession();
  const { dark, theme, font, setDark, setTheme, setFont, setDarkModeSchedule } = useTheme();
  const [settings, setSettingsState] = useState<UserSettings>(
    () => getLocalSettings() || { ...DEFAULT_SETTINGS, selectedClass: session?.selectedClass || "" }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updatedAtRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const selfTriggeredRef = useRef(false);

  // Apply ALL settings to ThemeProvider (for full sync: server/cross-device/cross-instance)
  const applyToTheme = useCallback(
    (s: UserSettings) => {
      setDark(s.darkMode);
      setTheme(s.theme);
      setFont(s.font);
      setDarkModeSchedule(s.darkModeSchedule);
    },
    [setDark, setTheme, setFont, setDarkModeSchedule]
  );

  // Keep settings state synced with ThemeProvider for header/landing toggles
  // that bypass updateSettings (e.g. header dark mode button)
  useEffect(() => {
    setSettingsState(prev => {
      if (prev.darkMode === dark && prev.theme === theme && prev.font === font) return prev;
      const next = { ...prev, darkMode: dark, theme, font };
      saveLocalSettings(next);
      return next;
    });
  }, [dark, theme, font]);

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
          // Server has newer data (cross-device sync) — apply everything
          setSettingsState(data.settings);
          saveLocalSettings(data.settings);
          setTimeout(() => applyToTheme(data.settings), 0);
        } else if (!localSettings && serverHasData) {
          // No local settings at all and server has real data — first load
          setSettingsState(data.settings);
          saveLocalSettings(data.settings);
          setTimeout(() => applyToTheme(data.settings), 0);
        }
        // Otherwise: local settings exist or server only has defaults —
        // keep local state, don't override theme. The inline script +
        // ThemeProvider already applied the correct appearance.
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
  // Use a ref to always have latest settings for the debounced server save
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback(
    (updates: Partial<UserSettings>) => {
      setSettingsState((prev) => {
        const next = { ...prev, ...updates };
        saveLocalSettings(next);

        // Schedule debounced save using ref to capture latest state
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => saveToServer(next), DEBOUNCE_MS);

        // Broadcast to other useSettings instances in this tab
        selfTriggeredRef.current = true;
        window.dispatchEvent(
          new CustomEvent(SETTINGS_SYNC_EVENT, { detail: next })
        );

        return next;
      });

      // Only apply appearance fields that were explicitly changed
      if ("darkMode" in updates) setDark(updates.darkMode!);
      if ("theme" in updates) setTheme(updates.theme!);
      if ("font" in updates) setFont(updates.font!);
      if ("darkModeSchedule" in updates) setDarkModeSchedule(updates.darkModeSchedule!);
    },
    [saveToServer, setDark, setTheme, setFont, setDarkModeSchedule]
  );

  // Cross-instance sync: listen for settings changes from other useSettings() instances
  // Uses queueMicrotask to avoid setState during another component's render phase
  useEffect(() => {
    const handler = (e: Event) => {
      if (selfTriggeredRef.current) {
        selfTriggeredRef.current = false;
        return; // Skip - this instance originated the change
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
              notes: row.notes ?? {},
              recentSubjects: row.recent_subjects ?? [],
              countdownDetailed: row.countdown_detailed ?? true,
              streak: row.streak ?? null,
              notifSoundEnabled: row.notif_sound_enabled ?? true,
              notifBrowserEnabled: row.notif_browser_enabled ?? true,
              notifPushEnabled: row.notif_push_enabled ?? true,
              notifEmailEnabled: row.notif_email_enabled ?? true,
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
