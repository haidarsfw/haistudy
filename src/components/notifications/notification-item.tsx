"use client";

import { useCallback, createElement } from "react";
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
  onActivate?: () => void;
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
  onActivate,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const scopeCtx = useOptionalScope();

  const icon = notificationIcon(notification);
  const ctxIcon = contextIcon(notification);
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
      // Center rows persist on click (mark-read only); only X/swipe removes them.
      keepOnActivate: true,
    });
    onActivate?.();
  }, [notification, onAnnouncementClick, onRead, onDismiss, navigateForum, onActivate]);

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
      className={`group/item relative flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card px-3 py-2.5 pr-8 text-left transition-colors hover:bg-muted/40 sm:pr-3 ${
        clickable ? "cursor-pointer" : ""
      } ${notification.read && variant === "center" ? "opacity-60" : ""}`}
    >
      {/* Type icon + context corner badge */}
      <div className="relative mt-0.5 shrink-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            notification.read && variant === "center"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          }`}
        >
          {createElement(icon, { className: "h-3.5 w-3.5" })}
        </div>
        {ctxIcon && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">
            {createElement(ctxIcon, { className: "h-2 w-2" })}
          </span>
        )}
      </div>

      {/* Body. Desktop: title + time inline on top. Mobile: title on top, time
          on its own muted line at the bottom (keeps the right side clean for the
          centered X — no cramped time next to it). */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{label}</p>
          <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:block">{time}</span>
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
        <span className="mt-0.5 block text-[10px] text-muted-foreground sm:hidden">{time}</span>
      </div>

      {/* Dismiss. Mobile: a bare X (no circle) at the right edge, vertically
          centered, content to its left (never covers the time). Desktop: a
          hover-reveal circle in the TOP-LEFT corner (toast-style overlay).
          stopPropagation so dismissing never also activates/routes. */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        onPointerDownCapture={(e) => e.stopPropagation()}
        className="absolute right-2 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-muted-foreground transition-opacity hover:text-foreground sm:-left-2 sm:-top-2 sm:right-auto sm:h-5 sm:w-5 sm:translate-y-0 sm:rounded-full sm:bg-foreground/10 sm:text-foreground/60 sm:opacity-0 sm:ring-1 sm:ring-foreground/10 sm:backdrop-blur-sm sm:group-hover/item:opacity-100 sm:hover:bg-foreground/20 sm:hover:text-foreground"
        aria-label={t("notification.dismiss")}
      >
        <X className="h-4 w-4 sm:h-3 sm:w-3" />
      </button>
    </div>
  );
}
