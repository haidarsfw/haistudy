"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Check } from "lucide-react";
import { CLASSES } from "@/lib/constants";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useSession } from "@/components/providers/session-provider";

interface ClassSelectorProps {
  onSelect: (cls: string) => void;
  selected?: string;
}

export function ClassSelector({ onSelect, selected }: ClassSelectorProps) {
  const { updateSession } = useSession();

  const handleSelect = useCallback(
    (cls: string) => {
      updateSession({ selectedClass: cls });
      onSelect(cls);
    },
    [updateSession, onSelect]
  );

  return (
    <motion.div
      className="flex flex-col items-center gap-6"
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="flex flex-col items-center gap-2 text-center" variants={staggerItem}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-semibold">Pilih Kelas</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          Pilih kelas kamu untuk personalisasi. Semua kelas mendapat materi yang
          sama.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
        {CLASSES.map((cls, i) => (
          <motion.button
            key={cls}
            onClick={() => handleSelect(cls)}
            variants={staggerItem}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`
              relative flex items-center justify-center rounded-xl border-2 p-3 text-sm font-medium
              transition-colors duration-200
              ${
                selected === cls
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }
            `}
          >
            {selected === cls && (
              <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />
            )}
            {cls}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
