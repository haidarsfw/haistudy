import type { Schedule } from "@/types";

// Scope s3-uts-pba — Semester 3, UTS, Pendidikan Bahasa Arab (UNJ).
// No timetable and no exam dates yet. The dashboard countdown reads this and
// simply shows nothing while it is empty, which is the correct answer.
export const weeklySchedule: Schedule[] = [];

export const examSchedule: Schedule[] = [];

export function getNextExam(): Schedule | null {
  const now = new Date();
  const upcoming = examSchedule
    .filter((s) => s.examDate && new Date(s.examDate) > now)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
  return upcoming[0] ?? null;
}
