import type { ForumThread } from "@/types";

// Scope s1-uts-pba — Semester 1, UTS, Pendidikan Bahasa Arab (UNJ). Forum starts empty for this scope.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
