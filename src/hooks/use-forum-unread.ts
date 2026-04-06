"use client";

import { useMemo } from "react";
import type { Notification } from "@/types";

const FORUM_TYPES = new Set(["forum_thread", "comment_reply", "thread_reply"]);

/**
 * Derives forum unread state from notification data.
 * Accepts notifications as a parameter to avoid duplicate subscriptions.
 */
export function useForumUnread(notifications: Notification[]) {
  return useMemo(() => {
    const unread = notifications.filter(
      (n) => !n.read && FORUM_TYPES.has(n.type)
    );

    const countBySubject: Record<string, number> = {};
    for (const n of unread) {
      if (n.subjectId) {
        countBySubject[n.subjectId] = (countBySubject[n.subjectId] || 0) + 1;
      }
    }

    return {
      totalUnread: unread.length,
      hasUnread: (subjectId: string) => (countBySubject[subjectId] || 0) > 0,
      countBySubject,
    };
  }, [notifications]);
}
