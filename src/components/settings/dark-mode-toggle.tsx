"use client";

import { Moon, Sun, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface DarkModeToggleProps {
  darkMode: boolean;
  schedule: { enabled: boolean; start: string; end: string };
  onDarkModeChange: (dark: boolean) => void;
  onScheduleChange: (schedule: {
    enabled: boolean;
    start: string;
    end: string;
  }) => void;
}

export function DarkModeToggle({
  darkMode,
  schedule,
  onDarkModeChange,
  onScheduleChange,
}: DarkModeToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Dark mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {darkMode ? (
            <Moon className="h-4 w-4 text-primary" />
          ) : (
            <Sun className="h-4 w-4 text-primary" />
          )}
          <Label htmlFor="dark-mode">{t("settings.dark_mode")}</Label>
        </div>
        <Switch
          id="dark-mode"
          checked={darkMode}
          onCheckedChange={(checked) => { sounds.toggle(); onDarkModeChange(checked); }}
        />
      </div>

      {/* Schedule */}
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="schedule-toggle" className="text-sm">
              {t("settings.auto_schedule")}
            </Label>
          </div>
          <Switch
            id="schedule-toggle"
            checked={schedule.enabled}
            onCheckedChange={(enabled) => {
              sounds.toggle();
              onScheduleChange({ ...schedule, enabled });
            }}
          />
        </div>

        <AnimatePresence>
          {schedule.enabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("settings.dark_label")}</span>
                <Input
                  type="time"
                  value={schedule.start}
                  onChange={(e) =>
                    onScheduleChange({ ...schedule, start: e.target.value })
                  }
                  className="h-8 w-28 text-xs"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={schedule.end}
                  onChange={(e) =>
                    onScheduleChange({ ...schedule, end: e.target.value })
                  }
                  className="h-8 w-28 text-xs"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
