"use client";

import { useContext } from "react";
import { SettingsContext } from "@/components/providers/settings-provider";

/**
 * Settings hook: Consumes the shared SettingsContext to avoid duplicate fetches.
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
