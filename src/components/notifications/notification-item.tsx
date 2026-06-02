"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { X } from "lucide-react";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { useTranslation } from "@/components/providers/language-provider";
import {
  notificationIcon,
  contextIcon,
  notificationLabel,
  activateNotification,
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
  // When false the row doesn't handle its own click - the parent (popup)
  // routes taps via its own click/drag wrapper so swipe-to-dismiss still works.
  clickable?: boolean;
}

/**
 * Single notification row shared by the notification center dropdown and the
 * transient popup so both surfaces look + behave identically.
 *
 * Layout (matches the reference design):
 *  - small dismiss X top-left (hover-reveal on desktop, always on mobile)
 *  - type icon with a context corner badge
 *  - title + relative time on one row, description below
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
  clickable = true,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const scopeCtx = useOptionalScope();

  const Icon = notificationIcon(notification);
  const CtxIcon = contextIcon(notification);
  const label = notificationLabel(notification, t);
  // Relative time, e.g. "37 mnt yang lalu" / "37 mins ago".
  const time = formatDistanceToNowStrict(new Date(notification.createdAt), {
    addSuffix: true,
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
    activateNotification(notification, {
      navigateForum,
      onRead,
      onAnnouncementClick,
      onDismiss,
    });
  }, [notification, onAnnouncementClick, onRead, onDismiss, navigateForum]);

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter") handleClick();
            }
          : undefined
      }
      className={`group/item relative flex w-full items-start gap-3 py-2.5 pl-9 pr-3 text-left transition-colors hover:bg-muted/50 ${
        clickable ? "cursor-pointer" : ""
      } ${notification.read && variant === "center" ? "opacity-60" : ""}`}
    >
      {/* Dismiss - small, top-left. Always tappable on mobile, hover-reveal on
          desktop. stopPropagation so dismissing never also activates/routes. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        onPointerDownCapture={(e) => e.stopPropagation()}
        className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card/80 text-muted-foreground ring-1 ring-border backdrop-blur transition-opacity hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover/item:opacity-100"
        aria-label={t("notification.dismiss")}
      >
        <X className="h-3 w-3" />
      </button>

      {/* Type icon + context corner badge */}
      <div className="relative mt-0.5 shrink-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            notification.read && variant === "center"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        {CtxIcon && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
            <CtxIcon className="h-2 w-2" />
          </span>
        )}
      </div>

      {/* Body: title + relative time on top, description below */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{label}</p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{time}</span>
        </div>
        {notification.preview && (
          <p
            className={
              notification.type === "announcement" && variant === "popup"
                ? "mt-0.5 max-h-48 overflow-y-auto whitespace-pre-line break-words text-[11px] leading-relaxed text-muted-foreground"
                : "mt-0.5 truncate text-[11px] text-muted-foreground"
            }
          >
            {notification.preview}
          </p>
        )}
      </div>

      {!notification.read && (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );
}
