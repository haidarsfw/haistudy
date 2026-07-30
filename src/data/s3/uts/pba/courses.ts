import type { Subject } from "@/types";

// Scope s3-uts-pba — Semester 3, UTS, Pendidikan Bahasa Arab (UNJ).
// For the '25 intake. Shown as an upcoming period; not on sale yet.
//
// No subjects authored yet. Filling this array plus content.ts is the whole job:
// every page that lists material already handles an empty period and says so in
// words ("Mata kuliah belum tersedia untuk periode ini") instead of breaking.
export const subjects: Subject[] = [];

// Legacy alias for compat with existing imports.
export const courses = subjects;

export function getSubjectById(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
