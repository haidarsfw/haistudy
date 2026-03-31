"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import { translate } from "@/lib/i18n";
import { useSettings } from "@/hooks/use-settings";

interface LanguageContextValue {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "id",
  t: (key) => key,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const locale: Locale = settings.language || "id";

  const t = useCallback(
    (key: string) => translate(locale, key),
    [locale]
  );

  const setLocale = useCallback(
    (newLocale: Locale) => {
      updateSettings({ language: newLocale });
    },
    [updateSettings]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
