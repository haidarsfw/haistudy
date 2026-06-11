import type { Schedule } from "@/types";

// B29 UTS has no recurring weekly timetable in-app.
export const weeklySchedule: Schedule[] = [];

export const examSchedule: Schedule[] = [];

export function getNextExam(): Schedule | null {
  const now = new Date();
  const upcoming = examSchedule
    .filter((s) => s.examDate && new Date(s.examDate) > now)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime());
  return upcoming[0] ?? null;
}
