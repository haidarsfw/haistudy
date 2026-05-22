import type { Subject } from "@/types";

export const courses: Subject[] = [
  {
    id: "bizethics",
    name: "Business Ethics",
    shortName: "Biz Ethics",
    icon: "Scale",
    description: "Prinsip etika dan tanggung jawab dalam praktik bisnis",
    color: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "opsmgmt",
    name: "Operations Management",
    shortName: "Ops Mgmt",
    icon: "Settings2",
    description: "Manajemen operasional dan proses bisnis",
    color: "text-orange-600 dark:text-orange-400",
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

// Legacy alias for compat with existing imports.
export const subjects = courses;

export function getSubjectById(id: string): Subject | undefined {
  return courses.find((s) => s.id === id);
}
