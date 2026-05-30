import type { Schedule } from "@/types";

// Regular class schedule (Semester 2)
export const weeklySchedule: Schedule[] = [
  {
    subject: "Statistics I",
    subjectId: "statistik",
    day: "Kamis",
    startTime: "09:20",
    endTime: "11:00",
    sessions: 1,
  },
  {
    subject: "Business Economics",
    subjectId: "biseko",
    day: "Kamis",
    startTime: "13:20",
    endTime: "17:00",
    sessions: 2,
  },
  {
    subject: "CB: Kewarganegaraan",
    subjectId: "cbkwn",
    day: "Jumat",
    startTime: "07:20",
    endTime: "09:00",
    sessions: 1,
  },
  {
    subject: "Accounting for Business",
    subjectId: "akuntansi",
    day: "Jumat",
    startTime: "15:20",
    endTime: "19:00",
    sessions: 2,
  },
  {
    subject: "Foundations of AI",
    subjectId: "foundai",
    day: "Sabtu",
    startTime: "07:20",
    endTime: "09:00",
    sessions: 1,
  },
];

// UTS exam schedule - Jadwal resmi BINUSMAYA (Business Management B29)
export const examSchedule: Schedule[] = [
  {
    subject: "Foundations of AI",
    subjectId: "foundai",
    day: "Rabu",
    startTime: "08:00",
    endTime: "09:40",
    sessions: 1,
    examDate: "2026-04-15T08:00:00",
    examType: "onsite",
  },
  {
    subject: "Statistics I",
    subjectId: "statistik",
    day: "Jumat",
    startTime: "13:30",
    endTime: "15:10",
    sessions: 1,
    examDate: "2026-04-17T13:30:00",
    examType: "onsite",
  },
  {
    subject: "Business Economics",
    subjectId: "biseko",
    day: "Senin",
    startTime: "08:00",
    endTime: "09:40",
    sessions: 1,
    examDate: "2026-04-20T08:00:00",
    examType: "onsite",
  },
  {
    subject: "Accounting for Business",
    subjectId: "akuntansi",
    day: "Selasa",
    startTime: "15:00",
    endTime: "17:00",
    sessions: 1,
    examDate: "2026-04-21T15:00:00",
    examType: "onsite",
  },
  {
    subject: "CB: Kewarganegaraan",
    subjectId: "cbkwn",
    day: "Rabu",
    startTime: "17:00",
    endTime: "17:00",
    sessions: 1,
    examDate: "2026-04-22T17:00:00",
    examType: "online",
    examNote: "Batas akhir pengumpulan via exam.apps.binus.ac.id",
  },
];

/**
 * Get the next upcoming exam from the schedule.
 * Returns null if all exams are past or no exam dates are set.
 */
export function getNextExam(): Schedule | null {
  const now = new Date();
  const upcoming = examSchedule
    .filter((s) => s.examDate && new Date(s.examDate) > now)
    .sort(
      (a, b) =>
        new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime()
    );
  return upcoming[0] ?? null;
}
