import type { ForumThread } from "@/types";

// UAS-scope pinned forum threads. Empty until UAS materi/admin posts seeded.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
