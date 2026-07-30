import type { ForumThread } from "@/types";

// Scope s3-uas-pba — Semester 3, UAS, Pendidikan Bahasa Arab (UNJ). Forum starts empty for this scope.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
