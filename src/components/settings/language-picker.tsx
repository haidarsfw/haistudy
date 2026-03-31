"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { tapScale, scaleIn } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import type { Locale } from "@/lib/i18n";

interface LanguagePickerProps {
  value: Locale;
  onChange: (locale: Locale) => void;
}

const LANGUAGES: { id: Locale; label: string; flag: string }[] = [
  { id: "id", label: "Bahasa Indonesia", flag: "ID" },
  { id: "en", label: "English", flag: "EN" },
];

export function LanguagePicker({ value, onChange }: LanguagePickerProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("settings.language_label")}</label>
      <div className="flex gap-2">
        {LANGUAGES.map((lang) => (
          <motion.button
            key={lang.id}
            onClick={() => { sounds.toggle(); onChange(lang.id); }}
            whileTap={tapScale}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              value === lang.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            <span className="text-xs font-bold">{lang.flag}</span>
            <span>{lang.label}</span>
            <AnimatePresence>
              {value === lang.id && (
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
          </motion.button>
        ))}
      </div>
    </div>
  );
}
