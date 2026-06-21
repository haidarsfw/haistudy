"use client";

import { createElement, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { notificationSpring } from "@/lib/motion";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { activateNotification, notificationIcon, notificationLabel } from "./notification-shared";
import type { Notification } from "@/types";

interface NotificationPopupProps {
  notification: Notification | null;
  onDismiss: () => void;
  // Optional: mark-read + announcement-detail wiring (falls back to no-ops).
  onRead?: (id: string) => void;
  onAnnouncementClick?: (n: Notification) => void;
}

/**
 * Transient incoming-notification popup. Styled to match the app's toast
 * (compact pill, X top-left, small round icon) instead of the full notification
 * row, so DM/mention popups look clean + consistent. Tap still routes (DM →
 * opens the thread); swipe dismisses.
 */
export function NotificationPopup({
  notification,
  onDismiss,
  onRead,
  onAnnouncementClick,
}: NotificationPopupProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggedRef = useRef(false);
  const router = useRouter();
  const scopeCtx = useOptionalScope();
  const { t } = useTranslation();

  const navigateForum = useCallback(
    (n: Notification) => {
      const base = scopeCtx ? `/${scopeCtx.scopePath}` : "";
      if (n.subjectId) {
        router.push(`${base}/subject/${n.subjectId}?tab=5`);
      }
    },
    [router, scopeCtx]
  );

  useEffect(() => {
    if (notification) {
      timeoutRef.current = setTimeout(onDismiss, 4000);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [notification, onDismiss]);

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          key={notification.id}
          variants={notificationSpring}
          initial="hidden"
          animate="visible"
          exit="exit"
          drag
          dragSnapToOrigin
          dragElastic={0.5}
          onDragStart={() => {
            draggedRef.current = true;
          }}
          onDragEnd={(_, info) => {
            const { offset, velocity } = info;
            const dismiss =
              offset.x > 70 ||
              offset.x < -70 ||
              offset.y < -70 ||
              Math.abs(velocity.x) > 500 ||
              velocity.y < -500;
            if (dismiss) onDismiss();
            requestAnimationFrame(() => {
              draggedRef.current = false;
            });
          }}
          onClick={() => {
            if (draggedRef.current) return;
            activateNotification(notification, {
              navigateForum,
              onRead: (id) => onRead?.(id),
              onAnnouncementClick,
              onDismiss: () => onDismiss(),
            });
          }}
          className="group/toast pointer-events-auto fixed right-3 top-16 z-[140] flex w-[calc(100vw-1.5rem)] max-w-sm cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left shadow-lg sm:right-4 sm:w-fit sm:min-w-[17rem] sm:max-w-md sm:gap-3 sm:px-4 sm:py-3"
        >
          {/* Dismiss — X top-left (matches the toast) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            onPointerDownCapture={(e) => e.stopPropagation()}
            aria-label={t("notification.dismiss")}
            className="absolute -left-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-foreground/15 text-foreground/70 ring-1 ring-foreground/10 backdrop-blur-sm transition-colors hover:bg-foreground/25 hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Type icon */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {createElement(notificationIcon(notification), { className: "h-3.5 w-3.5" })}
          </div>

          {/* Title + preview */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-snug text-foreground sm:text-sm">
              {notificationLabel(notification, t)}
            </p>
            {notification.preview && (
              <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground sm:text-xs">
                {notification.preview}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
