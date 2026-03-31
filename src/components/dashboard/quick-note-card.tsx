"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/components/providers/language-provider";
import { staggerItem } from "@/lib/motion";

const STORAGE_KEY = "hs-quick-note";

export function QuickNoteCard() {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setNote(stored);
    } catch {}
  }, []);

  const saveNote = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, value);
    }, 500);
  }, []);

  const handleChange = (value: string) => {
    setNote(value);
    saveNote(value);
  };

  return (
    <motion.div
      variants={staggerItem}
      className="rounded-xl border border-border bg-card p-4 transition-colors light-card-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <StickyNote className="h-4 w-4 text-amber-500" />
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          {t("dashboard.quick_note")}
        </span>
      </div>
      <textarea
        value={note}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t("dashboard.quick_note_placeholder")}
        className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none h-[60px]"
      />
    </motion.div>
  );
}
