"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Lock, Crown } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { FONTS } from "@/lib/constants";
import type { FontId } from "@/types";
import { tapScale, scaleIn } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import { FONT_STACK } from "@/lib/fonts";

interface FontPickerProps {
  value: FontId;
  canUseVip: boolean;
  onChange: (font: FontId) => void;
}

export function FontPicker({ value, canUseVip, onChange }: FontPickerProps) {
  const { t } = useTranslation();

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
              // Each name is set in its own face; opening the picker fetches them.
              style={{ fontFamily: FONT_STACK[font.id] }}
              className={`relative flex items-center justify-center rounded-lg border px-6 py-2 text-sm min-h-[40px] transition-colors ${
                value === font.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              } ${locked ? "opacity-60" : ""}`}
            >
              {/* Crown + status icon are absolute so the name stays optically
                  centered; px-6 reserves symmetric room for both. */}
              {font.vip && (
                <Crown className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-amber-500" />
              )}
              <span className="min-w-0 truncate text-center">{font.name}</span>
              <span className="absolute right-2 top-1/2 flex w-4 -translate-y-1/2 justify-center">
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
