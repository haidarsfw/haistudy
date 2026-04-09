"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageCircle, Reply, X, Megaphone } from "lucide-react";
import type { Notification } from "@/types";

interface NotificationPopupProps {
  notification: Notification | null;
  onDismiss: () => void;
}

export function NotificationPopup({
  notification,
  onDismiss,
}: NotificationPopupProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notification) {
      // Auto-dismiss after 3 seconds
      timeoutRef.current = setTimeout(onDismiss, 3000);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [notification, onDismiss]);

  const getIcon = () => {
    if (!notification) return null;
    if (notification.type === "announcement") {
      return <Megaphone className="h-4 w-4" />;
    }
    switch (notification.context) {
      case "chat":
        return <MessageCircle className="h-4 w-4" />;
      case "forum":
        return <Reply className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getLabel = () => {
    if (!notification) return "";
    switch (notification.type) {
      case "mention":
        return `${notification.senderName} menyebut kamu`;
      case "mention_all":
        return `${notification.senderName} menyebut @all`;
      case "thread_reply":
        return `${notification.senderName} membalas thread`;
      case "announcement":
        return "Pengumuman baru";
      default:
        return "Notifikasi baru";
    }
  };

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: 20 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.x > 80) onDismiss();
          }}
          className="fixed right-4 top-16 z-[60] w-96 max-w-[calc(100vw-2rem)] cursor-pointer rounded-lg border border-border bg-card p-4 shadow-lg max-h-[70vh] overflow-y-auto"
          onClick={onDismiss}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            className="absolute -top-2.5 -right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-border text-foreground shadow-md hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{getLabel()}</p>
              {notification.preview && (
                <p className={`mt-1 text-sm ${
                  notification.type === "announcement"
                    ? "whitespace-pre-line break-words text-foreground max-h-48 overflow-y-auto leading-relaxed"
                    : "truncate text-xs text-muted-foreground"
                }`}>
                  {notification.preview}
                </p>
              )}
              {notification.context === "forum" && notification.threadTitle && (
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  di &quot;{notification.threadTitle}&quot;
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
