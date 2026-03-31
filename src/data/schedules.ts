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

// UTS exam schedule — predicted dates (April 13-25)
// NOTE: These are PREDICTIONS only, not official dates
export const examSchedule: Schedule[] = [
  {
    subject: "Statistics I",
    subjectId: "statistik",
    day: "Selasa",
    startTime: "09:00",
    endTime: "11:00",
    sessions: 1,
    examDate: "2026-04-14T09:00:00",
    examType: "onsite",
    examNote: "Prediksi jadwal — bukan jadwal resmi",
  },
  {
    subject: "Business Economics",
    subjectId: "biseko",
    day: "Kamis",
    startTime: "13:00",
    endTime: "15:00",
    sessions: 1,
    examDate: "2026-04-16T13:00:00",
    examType: "onsite",
    examNote: "Prediksi jadwal — bukan jadwal resmi",
  },
  {
    subject: "CB: Kewarganegaraan",
    subjectId: "cbkwn",
    day: "Sabtu",
    startTime: "07:30",
    endTime: "09:30",
    sessions: 1,
    examDate: "2026-04-18T07:30:00",
    examType: "onsite",
    examNote: "Prediksi jadwal — bukan jadwal resmi",
  },
  {
    subject: "Accounting for Business",
    subjectId: "akuntansi",
    day: "Rabu",
    startTime: "09:00",
    endTime: "11:00",
    sessions: 1,
    examDate: "2026-04-22T09:00:00",
    examType: "onsite",
    examNote: "Prediksi jadwal — bukan jadwal resmi",
  },
  {
    subject: "Foundations of AI",
    subjectId: "foundai",
    day: "Sabtu",
    startTime: "07:30",
    endTime: "09:30",
    sessions: 1,
    examDate: "2026-04-25T07:30:00",
    examType: "onsite",
    examNote: "Prediksi jadwal — bukan jadwal resmi",
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
