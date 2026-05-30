"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationSpring } from "@/lib/motion";
import { NotificationItem } from "./notification-item";
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
          className="fixed right-4 top-16 z-[60] w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg max-h-[70vh]"
        >
          {/* Shared item = identical style to the notification center. The
              item's own click rules handle route-then-dismiss vs dismiss. */}
          <NotificationItem
            notification={notification}
            variant="popup"
            onRead={(id) => onRead?.(id)}
            onAnnouncementClick={onAnnouncementClick}
            onDismiss={() => onDismiss()}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
