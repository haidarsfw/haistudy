"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { useOptionalScope } from "@/components/providers/scope-provider";

interface AiSuggestionsProps {
  subjectId?: string | null;
  onSelect: (text: string) => void;
}

const GENERAL_SUGGESTIONS_UTS = [
  "Apa saja mata kuliah yang tersedia?",
  "Bantu aku bikin jadwal belajar untuk UTS",
  "Jelaskan cara pakai fitur quiz",
  "Tips belajar efektif untuk UTS",
];

const GENERAL_SUGGESTIONS_UAS = [
  "Apa saja mata kuliah UAS yang tersedia?",
  "Bantu aku bikin jadwal belajar untuk UAS",
  "Bagaimana strategi menghadapi ujian kumulatif?",
  "Tips persiapan UAS yang efektif",
];

const SUBJECT_SUGGESTIONS_UTS: Record<string, string[]> = {
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

const SUBJECT_SUGGESTIONS_UAS: Record<string, string[]> = {
  bizethics: [
    "Apa saja prinsip utama etika bisnis?",
    "Jelaskan teori utilitarianisme dalam konteks bisnis",
    "Bagaimana CSR mempengaruhi reputasi perusahaan?",
    "Apa itu dilema etika dalam pengambilan keputusan?",
  ],
  opsmgmt: [
    "Jelaskan konsep supply chain management",
    "Apa itu lean manufacturing?",
    "Bagaimana cara menghitung capacity planning?",
    "Jelaskan metode forecasting dalam operations",
  ],
  akuntansi: [
    "Jelaskan laporan arus kas dan komponennya",
    "Bagaimana cara menganalisis rasio keuangan?",
    "Apa perbedaan akuntansi biaya dan akuntansi keuangan?",
    "Jelaskan konsep break-even analysis",
  ],
  foundai: [
    "Jelaskan arsitektur neural network secara detail",
    "Apa itu reinforcement learning dan contohnya?",
    "Bagaimana cara kerja convolutional neural network?",
    "Jelaskan bias dan fairness dalam sistem AI",
  ],
};

export function AiSuggestions({ subjectId, onSelect }: AiSuggestionsProps) {
  const scopeCtx = useOptionalScope();
  const isUas = scopeCtx?.scope.examPeriod === "uas";

  const subjectMap = isUas ? SUBJECT_SUGGESTIONS_UAS : SUBJECT_SUGGESTIONS_UTS;
  const generalSuggestions = isUas ? GENERAL_SUGGESTIONS_UAS : GENERAL_SUGGESTIONS_UTS;

  const suggestions = subjectId
    ? subjectMap[subjectId] || generalSuggestions
    : generalSuggestions;

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
