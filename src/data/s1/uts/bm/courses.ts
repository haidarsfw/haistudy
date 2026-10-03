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
  },
  {
    "id": "pancasila",
    "name": "Character Building: Pancasila",
    "shortName": "CB Pancasila",
    "icon": "Scale",
    "description": "Ideologi & nilai-nilai Pancasila",
    "color": "text-red-600 dark:text-red-400"
  },
  // Tested in the B30 UTS (owner, 4 Oct 2026); material not written yet.
  {
    "id": "matbis",
    "name": "Business Mathematics",
    "shortName": "Business Math",
    "icon": "Calculator",
    "description": "Matematika untuk keputusan bisnis",
    "color": "text-indigo-600 dark:text-indigo-400",
    "pending": true
  }
];

// Legacy alias for compat with existing imports.
export const courses = subjects;

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
