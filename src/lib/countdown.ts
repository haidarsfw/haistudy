import type { Schedule } from "@/types";

/**
 * Two assessment buckets shown by the exam countdowns + /jadwal grouping.
 * Onsite = a timed, on-campus exam. Everything else (assignments and the legacy
 * "online" deadline type) collapses into "assignment" — they serve the same
 * deadline-based meaning.
 */
export type ExamCategory = "onsite" | "assignment";

export function examCategory(exam: Schedule): ExamCategory {
  return exam.examType === "onsite" ? "onsite" : "assignment";
}

/** Next upcoming exam (examDate in the future), optionally filtered to a category. */
export function pickNextExam(
  exams: Schedule[],
  category?: ExamCategory
): Schedule | null {
  const now = Date.now();
  const upcoming = exams
    .filter((e) => e.examDate && new Date(e.examDate).getTime() > now)
    .filter((e) => !category || examCategory(e) === category)
    .sort(
      (a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime()
    );
  return upcoming[0] ?? null;
}

/** Whether a category has any upcoming exam — used to enable/disable a switch segment. */
export function hasUpcoming(exams: Schedule[], category: ExamCategory): boolean {
  return pickNextExam(exams, category) !== null;
}

const COUNTDOWN_TYPE_KEY = "hs-countdown-exam-type";

/** Persisted countdown category (defaults to onsite). Client-only. */
export function loadCountdownCategory(): ExamCategory {
  if (typeof window === "undefined") return "onsite";
  try {
    return localStorage.getItem(COUNTDOWN_TYPE_KEY) === "assignment"
      ? "assignment"
      : "onsite";
  } catch {
    return "onsite";
  }
}

export function saveCountdownCategory(category: ExamCategory): void {
  try {
    localStorage.setItem(COUNTDOWN_TYPE_KEY, category);
  } catch {
    /* non-fatal: selection just won't persist */
  }
}
