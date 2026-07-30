import type { ForumThread } from "@/types";

// Scope s3-uts-bm — Semester 3, UTS, Business Management. Forum starts empty for this scope.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
