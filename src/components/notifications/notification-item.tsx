"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { X } from "lucide-react";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { useTranslation } from "@/components/providers/language-provider";
import {
  notificationIcon,
  contextIcon,
  notificationLabel,
  isInteractiveNotification,
  routeToNotification,
} from "./notification-shared";
import type { Notification } from "@/types";

interface NotificationItemProps {
  notification: Notification;
  // Non-interactive announcements may open a detail dialog instead of routing.
  onAnnouncementClick?: (n: Notification) => void;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  // Compact variant for the transient popup (no dismiss-on-hover chrome).
  variant?: "center" | "popup";
}

/**
 * Single notification row shared by the notification center dropdown and the
 * transient popup so both surfaces look + behave identically (Issue 7).
 *
 * Click rules:
 *  - Interactive (mention/forum reply/new thread) → route to target, then dismiss.
 *  - Announcement → open detail dialog (if provided), then mark read.
 *  - Other non-interactive → dismiss.
 */
export function NotificationItem({
  notification,
  onAnnouncementClick,
  onRead,
  onDismiss,
  variant = "center",
}: NotificationItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const scopeCtx = useOptionalScope();

  const Icon = notificationIcon(notification);
  const CtxIcon = contextIcon(notification);
  const label = notificationLabel(notification, t);
  const time = format(new Date(notification.createdAt), "HH:mm, d MMM", {
    locale: idLocale,
  });

  const navigateForum = useCallback(
    (n: Notification) => {
      const base = scopeCtx ? `/${scopeCtx.scopePath}` : "";
      if (n.subjectId) {
        // Forum lives in the subject page as a tab (index 5).
        router.push(`${base}/subject/${n.subjectId}?tab=5`);
      }
    },
    [router, scopeCtx]
  );

  const handleClick = useCallback(() => {
    if (notification.type === "announcement") {
      onAnnouncementClick?.(notification);
      if (!notification.read) onRead(notification.id);
      return;
    }
    if (isInteractiveNotification(notification)) {
      routeToNotification(notification, navigateForum);
      if (!notification.read) onRead(notification.id);
      onDismiss(notification.id);
      return;
    }
    // Non-interactive → just dismiss.
    if (!notification.read) onRead(notification.id);
    onDismiss(notification.id);
  }, [notification, onAnnouncementClick, onRead, onDismiss, navigateForum]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
      className={`group/item flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer ${
        notification.read && variant === "center" ? "opacity-60" : ""
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          notification.read && variant === "center"
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        {notification.preview && (
          <p
            className={
              notification.type === "announcement" && variant === "popup"
                ? "mt-0.5 whitespace-pre-line break-words text-[11px] text-muted-foreground leading-relaxed max-h-48 overflow-y-auto"
                : "mt-0.5 truncate text-[11px] text-muted-foreground"
            }
          >
            {notification.preview}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {CtxIcon && <CtxIcon className="h-3 w-3" />}
          <span>
            {notification.context === "chat"
              ? "Chat"
              : notification.context === "forum"
                ? "Forum"
                : "System"}
          </span>
          <span>&middot;</span>
          <span>{time}</span>
        </div>
      </div>
      {!notification.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground sm:opacity-40 sm:group-hover/item:opacity-100 hover:text-foreground hover:bg-muted transition-all sm:h-5 sm:w-5"
        aria-label={t("notification.dismiss")}
      >
        <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
      </button>
    </div>
  );
}
