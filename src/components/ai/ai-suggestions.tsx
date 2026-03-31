"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface AiSuggestionsProps {
  subjectId?: string | null;
  onSelect: (text: string) => void;
}

const GENERAL_SUGGESTIONS = [
  "Apa saja mata kuliah yang tersedia?",
  "Bantu aku bikin jadwal belajar untuk UTS",
  "Jelaskan cara pakai fitur quiz",
  "Tips belajar efektif untuk UTS",
];

const SUBJECT_SUGGESTIONS: Record<string, string[]> = {
  statistik: [
    "Jelaskan perbedaan mean, median, dan modus",
    "Bagaimana cara menghitung standar deviasi?",
    "Apa itu distribusi normal?",
    "Latihan soal tentang regresi linear",
  ],
  biseko: [
    "Jelaskan hukum permintaan dan penawaran",
    "Apa perbedaan GDP dan GNP?",
    "Jelaskan konsep elastisitas harga",
    "Ringkas materi tentang kebijakan moneter",
  ],
  cbkwn: [
    "Apa itu civic engagement?",
    "Jelaskan nilai-nilai Pancasila dalam konteks bisnis",
    "Ringkas materi tentang NKRI",
    "Apa peran warga negara dalam demokrasi?",
  ],
  akuntansi: [
    "Jelaskan persamaan dasar akuntansi",
    "Apa perbedaan debit dan kredit?",
    "Bagaimana cara membuat jurnal umum?",
    "Jelaskan siklus akuntansi",
  ],
  foundai: [
    "Apa itu machine learning?",
    "Jelaskan perbedaan AI, ML, dan Deep Learning",
    "Apa itu neural network?",
    "Jelaskan konsep supervised vs unsupervised learning",
  ],
};

export function AiSuggestions({ subjectId, onSelect }: AiSuggestionsProps) {
  const suggestions = subjectId
    ? SUBJECT_SUGGESTIONS[subjectId] || GENERAL_SUGGESTIONS
    : GENERAL_SUGGESTIONS;

  return (
    <div className="space-y-3 px-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="h-3.5 w-3.5" />
        <span>Coba tanya:</span>
      </div>
      <motion.div
        className="flex flex-wrap gap-2"
        variants={staggerContainer(0.04)}
        initial="hidden"
        animate="visible"
      >
        {suggestions.map((text) => (
          <motion.div key={text} variants={staggerItem}>
            <Button
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal rounded-xl px-3 py-1.5 text-left text-xs"
              onClick={() => onSelect(text)}
            >
              {text}
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
