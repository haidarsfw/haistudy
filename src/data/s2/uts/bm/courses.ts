import type { Subject } from "@/types";

export const subjects: Subject[] = [
  {
    id: "statistik",
    name: "Statistics I",
    shortName: "Statistik",
    icon: "BarChart3",
    description: "Dasar-dasar statistika untuk pengambilan keputusan bisnis",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "biseko",
    name: "Business Economics",
    shortName: "Biseko",
    icon: "TrendingUp",
    description: "Prinsip ekonomi dalam konteks bisnis dan pasar",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "cbkwn",
    name: "Character Building: Kewarganegaraan",
    shortName: "CB: KWN",
    icon: "Shield",
    description: "Pembentukan karakter dan nilai-nilai kewarganegaraan",
    color: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "akuntansi",
    name: "Accounting for Business",
    shortName: "Akuntansi",
    icon: "Calculator",
    description: "Dasar-dasar akuntansi untuk kebutuhan bisnis",
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "foundai",
    name: "Foundations of Artificial Intelligence",
    shortName: "Found. AI",
    icon: "Bot",
    description: "Pengantar kecerdasan buatan dan penerapannya",
    color: "text-rose-600 dark:text-rose-400",
  },
];

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

// New scope-aware name. Old `subjects` export preserved for legacy callsites.
export const courses = subjects;
