"use client";

import {
  Bell,
  MessageCircle,
  MessageSquare,
  Reply,
  AtSign,
  Megaphone,
  BarChart,
  type LucideIcon,
} from "lucide-react";
import { openChatToMessage } from "@/lib/events";
import type { Notification } from "@/types";

// ─── Single source of truth for notification presentation + behavior ───
// Used by BOTH the transient popup and the notification-center dropdown so
// the two surfaces stay visually + behaviorally identical (Issue 7).

/** Interactive = clicking routes somewhere (then dismisses). Otherwise click just dismisses. */
export function isInteractiveNotification(n: Notification): boolean {
  if (
    (n.type === "mention" || n.type === "mention_all") &&
    n.context === "chat" &&
    n.messageId
  ) {
    return true;
  }
  // Forum-context notifications navigate to the thread/subject.
  if (n.context === "forum" && (n.subjectId || n.threadId)) {
    return (
      n.type === "thread_reply" ||
      n.type === "forum_thread" ||
      n.type === "comment_reply" ||
      n.type === "poll_vote" ||
      n.type === "poll_result"
    );
  }
  return false;
}

export function notificationIcon(n: Notification): LucideIcon {
  switch (n.type) {
    case "mention":
    case "mention_all":
      return AtSign;
    case "thread_reply":
    case "comment_reply":
      return Reply;
    case "announcement":
      return Megaphone;
    case "forum_thread":
      return MessageSquare;
    case "poll_vote":
    case "poll_result":
      return BarChart;
    default:
      return Bell;
  }
}

export function contextIcon(n: Notification): LucideIcon | null {
  switch (n.context) {
    case "chat":
      return MessageCircle;
    case "forum":
      return Reply;
    case "system":
      return Bell;
    default:
      return null;
  }
}

export function notificationLabel(
  n: Notification,
  t: (key: string) => string
): string {
  switch (n.type) {
    case "mention":
      return `${n.senderName} ${t("notification.mentioned_you")}`;
    case "mention_all":
      return `${n.senderName} ${t("notification.mentioned_all")}`;
    case "thread_reply":
      return `${n.senderName} ${t("notification.replied_thread")}`;
    case "announcement":
      return t("notification.announcement");
    case "forum_thread":
      return `${n.senderName} ${t("notification.new_thread")}`;
    case "poll_vote":
      return `${n.senderName} ${t("notification.voted_poll")}`;
    case "poll_result":
      return t("notification.poll_result");
    case "comment_reply":
      return `${n.senderName} ${t("notification.replied_comment")}`;
    default:
      return t("notification.default");
  }
}

/**
 * Route to a notification's target. Returns true if it navigated (caller then
 * dismisses). `navigateForum` lets the caller supply scope-aware forum nav
 * (the helper can't read scope context itself).
 */
export function routeToNotification(
  n: Notification,
  navigateForum?: (n: Notification) => void
): boolean {
  if (
    (n.type === "mention" || n.type === "mention_all") &&
    n.context === "chat" &&
    n.messageId
  ) {
    openChatToMessage(n.messageId);
    return true;
  }
  if (n.context === "forum" && (n.subjectId || n.threadId)) {
    navigateForum?.(n);
    return true;
  }
  return false;
}
