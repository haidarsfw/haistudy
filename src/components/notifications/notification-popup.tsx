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
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.x > 80) onDismiss();
          }}
          onTap={() =>
            activateNotification(notification, {
              navigateForum,
              onRead: (id) => onRead?.(id),
              onAnnouncementClick,
              onDismiss: () => onDismiss(),
            })
          }
          className="fixed right-4 top-16 z-[60] w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg max-h-[70vh]"
        >
          {/* Shared item = identical style to the notification center. Tap is
              handled by the wrapper's onTap (coexists with swipe-to-dismiss),
              so the item itself is non-clickable; its X button still dismisses. */}
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
