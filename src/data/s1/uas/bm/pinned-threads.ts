import type { ForumThread } from "@/types";

// Forum starts empty for this scope; legacy forum held only test data.
export const PINNED_THREADS: Record<string, ForumThread[]> = {};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
