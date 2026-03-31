"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { FONTS } from "@/lib/constants";
import type { FontId } from "@/types";
import { tapScale, scaleIn } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface FontPickerProps {
  value: FontId;
  onChange: (font: FontId) => void;
}

const fontPreviewStyle: Record<FontId, string> = {
  jakarta: "font-heading",
  inter: "font-sans",
  poppins: "font-[family-name:var(--font-poppins)]",
};

export function FontPicker({ value, onChange }: FontPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("settings.font_label")}</label>
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map((font) => (
          <motion.button
            key={font.id}
            onClick={() => { sounds.click(); onChange(font.id); }}
            whileTap={tapScale}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm min-h-[38px] transition-colors ${fontPreviewStyle[font.id]} ${
              value === font.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <span>{font.name}</span>
            <span className="w-4 flex justify-center shrink-0">
              <AnimatePresence>
                {value === font.id && (
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
