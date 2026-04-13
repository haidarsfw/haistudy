"use client";

import { useState, useCallback, useEffect } from "react";
import type { ForumThread } from "@/types";

const STORAGE_KEY = "hs-forum-read-threads";

function getReadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadSet(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/**
 * Tracks which forum threads the user has already seen.
 * Purely localStorage-based — zero API calls.
 */
export function useThreadRead() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(getReadSet());
  }, []);

  const isRead = useCallback(
    (threadId: string) => readIds.has(threadId),
    [readIds]
  );

  const markRead = useCallback((threadId: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(threadId);
      saveReadSet(next);
      return next;
    });
  }, []);

  const unreadCount = useCallback(
    (threads: ForumThread[]) =>
      threads.filter((t) => !readIds.has(t.id)).length,
    [readIds]
  );

  const hasUnreadThreads = useCallback(
    (threads: ForumThread[]) =>
      threads.some((t) => !readIds.has(t.id)),
    [readIds]
  );

  return { isRead, markRead, unreadCount, hasUnreadThreads };
}
