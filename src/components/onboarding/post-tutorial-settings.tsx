"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ThemePicker } from "@/components/settings/theme-picker";
import { FontPicker } from "@/components/settings/font-picker";
import { LanguagePicker } from "@/components/settings/language-picker";
import { DarkModeToggle } from "@/components/settings/dark-mode-toggle";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useTranslation } from "@/components/providers/language-provider";
import { getSoundMuted, setSoundMuted, sounds } from "@/lib/sounds";

interface PostTutorialSettingsProps {
  onDone: () => void;
}

export function PostTutorialSettings({ onDone }: PostTutorialSettingsProps) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useSettings();
  const [soundMuted, setSoundMutedState] = useState(() => getSoundMuted());

  const handleDone = () => {
    sounds.correct();
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
      >
        <div className="p-6 pb-3 text-center shrink-0">
          <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-heading text-lg font-bold">
            {t("onboarding.post_settings_title")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("onboarding.post_settings_desc")}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-5 px-6 pb-6">
            {/* Theme */}
            <ThemePicker
              value={settings.theme}
              onChange={(v) => updateSettings({ theme: v })}
            />

            {/* Font */}
            <FontPicker
              value={settings.font}
              onChange={(v) => updateSettings({ font: v })}
            />

            {/* Language */}
            <LanguagePicker
              value={settings.language}
              onChange={(v) => updateSettings({ language: v })}
            />

            {/* Dark Mode */}
            <DarkModeToggle
              darkMode={settings.darkMode}
              schedule={settings.darkModeSchedule}
              onDarkModeChange={(dark) => updateSettings({ darkMode: dark })}
              onScheduleChange={(schedule) => updateSettings({ darkModeSchedule: schedule })}
            />

            {/* Sound effects */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.sound_effects")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.sound_effects_desc")}</p>
              </div>
              <Switch
                checked={!soundMuted}
                onCheckedChange={(checked) => {
                  setSoundMuted(!checked);
                  setSoundMutedState(!checked);
                  if (checked) sounds.toggle();
                }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 shrink-0">
          <button
            onClick={handleDone}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            {t("onboarding.post_settings_done")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
