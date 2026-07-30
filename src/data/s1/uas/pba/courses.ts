import type { Subject } from "@/types";

// Scope s1-uas-pba — Semester 1, UAS, Pendidikan Bahasa Arab (UNJ).
// Hidden: registered here but not reachable (stage 'hidden' in SCOPE_REGISTRY).
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
