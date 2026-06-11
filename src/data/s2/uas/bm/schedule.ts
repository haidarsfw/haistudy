import type { Schedule } from "@/types";

// No regular weekly class schedule is published for the UAS period.
export const weeklySchedule: Schedule[] = [];

// UAS exam & final-assessment schedule — Kelas LE86 (Business Management).
// examDate is local WIB (GMT+7): onsite = start time, online/assignment = deadline.
export const examSchedule: Schedule[] = [
  {
    subject: "Business Ethics",
    subjectId: "bizethics",
    day: "Senin",
    startTime: "23:59",
    endTime: "23:59",
    sessions: 1,
    examDate: "2026-06-22T23:59:00",
    examType: "assignment",
    examFormat: "AOL Group Project",
  },
  {
    subject: "Business Ethics",
    subjectId: "bizethics",
    day: "Selasa",
    startTime: "13:00",
    endTime: "14:40",
    sessions: 1,
    examDate: "2026-06-23T13:00:00",
    examType: "onsite",
    examFormat: "Theory: Final Exam",
  },
  {
    subject: "Foundations of Artificial Intelligence",
    subjectId: "foundai",
    day: "Rabu",
    startTime: "15:00",
    endTime: "16:40",
    sessions: 1,
    examDate: "2026-06-24T15:00:00",
    examType: "onsite",
    examFormat: "Theory: Final Exam",
  },
  {
    subject: "Accounting for Business",
    subjectId: "akuntansi",
    day: "Senin",
    startTime: "15:00",
    endTime: "17:00",
    sessions: 1,
    examDate: "2026-06-29T15:00:00",
    examType: "onsite",
    examFormat: "Theory: Final Exam",
  },
  {
    subject: "Business Economics",
    subjectId: "biseko",
    day: "Selasa",
    startTime: "13:00",
    endTime: "13:00",
    sessions: 1,
    examDate: "2026-06-30T13:00:00",
    examType: "assignment",
    examFormat: "Theory: Group Project (AOL)",
    examLink: "https://exam.apps.binus.ac.id",
  },
  {
    subject: "Business Statistics I",
    subjectId: "statistik",
    day: "Selasa",
    startTime: "13:00",
    endTime: "13:00",
    sessions: 1,
    examDate: "2026-06-30T13:00:00",
    examType: "assignment",
    examFormat: "Theory: Group Project",
    examLink: "https://exam.apps.binus.ac.id",
  },
  {
    subject: "Character Building: Kewarganegaraan",
    subjectId: "cbkwn",
    day: "Selasa",
    startTime: "17:00",
    endTime: "17:00",
    sessions: 1,
    examDate: "2026-06-30T17:00:00",
    examType: "assignment",
    examFormat: "Theory: Final Project",
    examLink: "https://exam.apps.binus.ac.id",
  },
  {
    subject: "Operations Management",
    subjectId: "opsmgmt",
    day: "Kamis",
    startTime: "08:00",
    endTime: "09:40",
    sessions: 1,
    examDate: "2026-07-02T08:00:00",
    examType: "onsite",
    examFormat: "Theory: Final Exam",
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
