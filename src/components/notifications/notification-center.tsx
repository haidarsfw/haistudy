"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import {
  Bell,
  MessageCircle,
  MessageSquare,
  Reply,
  CheckCheck,
  AtSign,
  Megaphone,
  BarChart,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { useTranslation } from "@/components/providers/language-provider";
import { openChatToMessage } from "@/lib/events";
import type { Notification } from "@/types";

function NotificationItem({
  notification,
  onRead,
  onDismiss,
  onAnnouncementClick,
  t,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onAnnouncementClick: (n: Notification) => void;
  t: (key: string) => string;
}) {
  const getIcon = () => {
    switch (notification.type) {
      case "mention":
        return <AtSign className="h-3.5 w-3.5" />;
      case "mention_all":
        return <AtSign className="h-3.5 w-3.5" />;
      case "thread_reply":
        return <Reply className="h-3.5 w-3.5" />;
      case "announcement":
        return <Megaphone className="h-3.5 w-3.5" />;
      case "forum_thread":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "poll_vote":
        return <BarChart className="h-3.5 w-3.5" />;
      case "poll_result":
        return <BarChart className="h-3.5 w-3.5" />;
      case "comment_reply":
        return <Reply className="h-3.5 w-3.5" />;
      default:
        return <Bell className="h-3.5 w-3.5" />;
    }
  };

  const getLabel = () => {
    switch (notification.type) {
      case "mention":
        return `${notification.senderName} ${t("notification.mentioned_you")}`;
      case "mention_all":
        return `${notification.senderName} ${t("notification.mentioned_all")}`;
      case "thread_reply":
        return `${notification.senderName} ${t("notification.replied_thread")}`;
      case "announcement":
        return t("notification.announcement");
      case "forum_thread":
        return `${notification.senderName} ${t("notification.new_thread")}`;
      case "poll_vote":
        return `${notification.senderName} ${t("notification.voted_poll")}`;
      case "poll_result":
        return t("notification.poll_result");
      case "comment_reply":
        return `${notification.senderName} ${t("notification.replied_comment")}`;
      default:
        return t("notification.default");
    }
  };

  const getContextIcon = () => {
    switch (notification.context) {
      case "chat":
        return <MessageCircle className="h-3 w-3" />;
      case "forum":
        return <Reply className="h-3 w-3" />;
      case "system":
        return <Bell className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const time = format(new Date(notification.createdAt), "HH:mm, d MMM", {
    locale: idLocale,
  });

  const handleClick = () => {
    if (notification.type === "announcement") {
      onAnnouncementClick(notification);
    } else if (
      (notification.type === "mention" || notification.type === "mention_all") &&
      notification.context === "chat"
    ) {
      // Open chat panel and scroll to the mentioned message
      openChatToMessage(notification.messageId);
    }
    if (!notification.read) onRead(notification.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
      className={`group/item flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          notification.read
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        }`}
      >
        {getIcon()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{getLabel()}</p>
        {notification.preview && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {notification.preview}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {getContextIcon()}
          <span>
            {notification.context === "chat" ? "Chat" : notification.context === "forum" ? "Forum" : "System"}
          </span>
          <span>&middot;</span>
          <span>{time}</span>
        </div>
      </div>
      {!notification.read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground sm:opacity-40 sm:group-hover/item:opacity-100 hover:text-foreground hover:bg-muted transition-all sm:h-5 sm:w-5"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
      </button>
    </div>
  );
}

interface NotificationCenterProps {
  hoverExpand?: boolean;
}

export function NotificationCenter({ hoverExpand }: NotificationCenterProps = {}) {
  const { notifications, unreadCount, markAsRead, dismissNotification } = useNotifications();
  const { t } = useTranslation();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Notification | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // When user clicks an announcement notification, show the dialog BUT keep the popover open
  const handleAnnouncementClick = useCallback((n: Notification) => {
    setSelectedAnnouncement(n);
    // Don't close popover — we want user to see other notifications after dismissing dialog
  }, []);

  // When dialog closes, bring focus back to popover conceptually
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setSelectedAnnouncement(null);
  }, []);

  // Prevent popover from closing when a dialog is open
  const handlePopoverOpenChange = useCallback((open: boolean) => {
    // Only allow closing if no dialog is open
    if (!open && selectedAnnouncement) return;
    setPopoverOpen(open);
  }, [selectedAnnouncement]);

  return (
    <>
    <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
      {hoverExpand ? (
        <PopoverTrigger
          render={
            <button
              aria-label={t("header.notifications")}
              className="group relative flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] cursor-pointer"
            />
          }
        >
          <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width,opacity] group-hover:max-w-[80px] group-hover:opacity-100">
            {t("notification.title")}
          </span>
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label={t("header.notifications")}
            />
          }
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-semibold">{t("notification.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => markAsRead()}
            >
              <CheckCheck className="h-3 w-3" />
              {t("notification.read_all")}
            </Button>
          )}
        </div>
        <Separator />

        {/* Notifications list — bounded height with scroll */}
        <div className="max-h-[min(60vh,400px)] overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <Bell className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                {t("notification.empty")}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onRead={(id) => markAsRead([id])}
                  onDismiss={dismissNotification}
                  onAnnouncementClick={handleAnnouncementClick}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>

    {/* Centered announcement detail dialog */}
    <Dialog
      open={!!selectedAnnouncement}
      onOpenChange={handleDialogClose}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Megaphone className="h-4 w-4 text-primary" />
            {t("notification.announcement")}
          </DialogTitle>
        </DialogHeader>
        {selectedAnnouncement && (
          <div className="space-y-3">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedAnnouncement.preview}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(selectedAnnouncement.createdAt), "EEEE, d MMMM yyyy HH:mm", { locale: idLocale })}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
