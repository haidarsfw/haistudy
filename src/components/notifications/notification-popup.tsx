"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { notificationSpring } from "@/lib/motion";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { NotificationItem } from "./notification-item";
import { activateNotification } from "./notification-shared";
import type { Notification } from "@/types";

interface NotificationPopupProps {
  notification: Notification | null;
  onDismiss: () => void;
  // Optional: mark-read + announcement-detail wiring (falls back to no-ops).
  onRead?: (id: string) => void;
  onAnnouncementClick?: (n: Notification) => void;
}

export function NotificationPopup({
  notification,
  onDismiss,
  onRead,
  onAnnouncementClick,
}: NotificationPopupProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while a drag is in progress so the click handler can ignore the
  // click that fires at the end of a drag (otherwise a swipe also activates).
  const draggedRef = useRef(false);
  const router = useRouter();
  const scopeCtx = useOptionalScope();

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
      // Auto-dismiss after 4 seconds (interactive ones can still be clicked).
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
            // Dismiss on a decisive swipe in ANY of right/left/up, or a fast
            // flick. Otherwise the card springs back to origin.
            const dismiss =
              offset.x > 70 ||
              offset.x < -70 ||
              offset.y < -70 ||
              Math.abs(velocity.x) > 500 ||
              velocity.y < -500;
            if (dismiss) onDismiss();
            // Clear AFTER the click that trailing a drag would fire.
            requestAnimationFrame(() => {
              draggedRef.current = false;
            });
          }}
          onClick={() => {
            // Ignore the click synthesized at the end of a drag; a genuine tap
            // (no drag) reliably activates - non-interactive falls through to
            // dismiss inside activateNotification.
            if (draggedRef.current) return;
            activateNotification(notification, {
              navigateForum,
              onRead: (id) => onRead?.(id),
              onAnnouncementClick,
              onDismiss: () => onDismiss(),
            });
          }}
          className="fixed right-4 top-16 z-[140] w-96 max-w-[calc(100vw-2rem)] cursor-pointer overflow-hidden rounded-lg border border-border bg-card shadow-lg max-h-[70vh]"
        >
          {/* Shared item = identical style to the notification center. The
              wrapper owns the click + drag gestures, so the item is
              non-clickable; its X button still dismisses via stopPropagation. */}
          <NotificationItem
            notification={notification}
            variant="popup"
            clickable={false}
            onRead={(id) => onRead?.(id)}
            onAnnouncementClick={onAnnouncementClick}
            onDismiss={() => onDismiss()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
