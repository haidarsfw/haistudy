"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { THEMES } from "@/lib/constants";
import type { ThemeId } from "@/types";
import { tapScale, scaleIn } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface ThemePickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("settings.theme_color")}</label>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((theme) => (
          <motion.button
            key={theme.id}
            onClick={() => { sounds.click(); onChange(theme.id); }}
            whileTap={tapScale}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm min-h-[38px] transition-colors ${
              value === theme.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span
              className="h-4 w-4 rounded-full ring-1 ring-border shrink-0"
              style={{ backgroundColor: theme.color }}
            />
            <span className="truncate">{theme.name}</span>
            <span className="w-4 flex justify-center shrink-0 ml-auto">
              <AnimatePresence>
                {value === theme.id && (
                  <motion.span
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
