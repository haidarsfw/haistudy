"use client";

import {
  Bell,
  MessageCircle,
  MessageSquare,
  Reply,
  AtSign,
  Megaphone,
  BarChart,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import { openChatToMessage, openDmTo } from "@/lib/events";
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
  // DM notifications open the chat DM with the sender (context = sender key).
  if (n.type === "dm_message" && n.context) return true;
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
    case "dm_message":
      return MessageCircle;
    case "exam_quota":
      return Ticket;
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
    case "dm_message":
      return n.senderName ? `${n.senderName} mengirim pesan` : "Pesan baru";
    case "exam_quota":
      return t("notification.exam_quota");
    default:
      return t("notification.default");
  }
}

/**
 * Single click/tap behavior shared by the notification-center row and the
 * transient popup so both surfaces behave identically:
 *  - announcement → open detail dialog (if any), mark read (no dismiss).
 *  - interactive  → route to target, mark read, dismiss.
 *  - other        → mark read, dismiss.
 * The popup wires this via framer's `onTap` (coexists with swipe-to-dismiss);
 * the row wires it via a native onClick.
 */
export function activateNotification(
  n: Notification,
  handlers: {
    navigateForum?: (n: Notification) => void;
    onRead?: (id: string) => void;
    onAnnouncementClick?: (n: Notification) => void;
    onDismiss?: (id: string) => void;
  }
): void {
  const { navigateForum, onRead, onAnnouncementClick, onDismiss } = handlers;
  if (n.type === "announcement") {
    onAnnouncementClick?.(n);
    if (!n.read) onRead?.(n.id);
    return;
  }
  if (isInteractiveNotification(n)) {
    routeToNotification(n, navigateForum);
    if (!n.read) onRead?.(n.id);
    onDismiss?.(n.id);
    return;
  }
  // Non-interactive → just dismiss.
  if (!n.read) onRead?.(n.id);
  onDismiss?.(n.id);
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
  if (n.type === "dm_message" && n.context) {
    openDmTo(n.context);
    return true;
  }
  return false;
}
