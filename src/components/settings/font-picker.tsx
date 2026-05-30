"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Crown } from "lucide-react";
import { useEffect } from "react";
import { toast } from "@/components/ui/toast";
import { FONTS } from "@/lib/constants";
import type { FontId } from "@/types";
import { tapScale, scaleIn } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import { ensureFontLoaded } from "@/lib/lazy-fonts";

interface FontPickerProps {
  value: FontId;
  canUseVip: boolean;
  onChange: (font: FontId) => void;
}

// Inline font-family stack so each option's label renders in its own font,
// even before the data-font global rule applies. VIP fonts use the lazy stack.
const fontPreviewStyle: Record<FontId, string> = {
  jakarta: "var(--font-heading), sans-serif",
  inter: "var(--font-body), sans-serif",
  poppins: "var(--font-poppins), sans-serif",
  lora: '"Lora", Georgia, serif',
  jetbrains: '"JetBrains Mono", ui-monospace, monospace',
  quicksand: '"Quicksand", system-ui, sans-serif',
  merriweather: '"Merriweather", Georgia, serif',
};

export function FontPicker({ value, canUseVip, onChange }: FontPickerProps) {
  const { t } = useTranslation();

  // Preload the VIP font stylesheets so the in-picker previews actually render
  // in-font. Cheap + idempotent; only injects each <link> once.
  useEffect(() => {
    for (const font of FONTS) {
      if (font.vip) ensureFontLoaded(font.id);
    }
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("settings.font_label")}</label>
      <div className="grid grid-cols-2 gap-2">
        {FONTS.map((font) => {
          const locked = !!font.vip && !canUseVip;
          return (
            <motion.button
              key={font.id}
              onClick={() => {
                if (locked) {
                  sounds.click();
                  toast.info(t("vip.font_locked"));
                  return;
                }
                sounds.click();
                onChange(font.id);
              }}
              whileTap={tapScale}
              style={{ fontFamily: fontPreviewStyle[font.id] }}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm min-h-[38px] transition-colors ${
                value === font.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              } ${locked ? "opacity-60" : ""}`}
            >
              <span className="flex min-w-0 items-center gap-1">
                {font.vip && (
                  <Crown className="h-3 w-3 shrink-0 text-amber-500" />
                )}
                <span className="break-words">{font.name}</span>
              </span>
              <span className="w-4 flex justify-center shrink-0">
                {locked ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : (
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
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
