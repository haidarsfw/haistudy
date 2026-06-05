import type { Subject } from "@/types";

export const subjects: Subject[] = [
  {
    "id": "marketing",
    "name": "Marketing Management",
    "shortName": "Marketing",
    "icon": "TrendingUp",
    "description": "Strategi pemasaran & marketing mix",
    "color": "text-pink-600 dark:text-pink-400"
  },
  {
    "id": "hr",
    "name": "Human Resources Management",
    "shortName": "HR Mgmt",
    "icon": "Users",
    "description": "Rekrutmen & manajemen kinerja",
    "color": "text-emerald-600 dark:text-emerald-400"
  },
  {
    "id": "mis",
    "name": "Management Information Systems for Leader",
    "shortName": "MIS",
    "icon": "Monitor",
    "description": "Sistem informasi & digital",
    "color": "text-cyan-600 dark:text-cyan-400"
  },
  {
    "id": "intro",
    "name": "Introduction to Management and Business",
    "shortName": "Intro Mgmt",
    "icon": "Briefcase",
    "description": "Dasar-dasar manajemen",
    "color": "text-amber-600 dark:text-amber-400"
  }
];

// Legacy alias for compat with existing imports.
export const courses = subjects;

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
