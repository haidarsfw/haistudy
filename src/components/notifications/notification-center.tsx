"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Megaphone, Sparkles } from "lucide-react";
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
import { usePatchNotes } from "@/hooks/use-patch-notes";
import { useTranslation } from "@/components/providers/language-provider";
import { notificationSpring } from "@/lib/motion";
import { NotificationItem } from "./notification-item";
import type { Notification } from "@/types";
import type { PatchNote } from "@/data/patch-notes";

interface NotificationCenterProps {
  hoverExpand?: boolean;
}

export function NotificationCenter({ hoverExpand }: NotificationCenterProps = {}) {
  const { notifications, unreadCount, markAsRead, dismissNotification } = useNotifications();
  const {
    notes: patchNotes,
    unreadCount: patchUnread,
    isRead: patchIsRead,
    markRead: patchMarkRead,
    markAllRead: patchMarkAllRead,
  } = usePatchNotes();
  const { t } = useTranslation();
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Notification | null>(null);
  const [selectedPatch, setSelectedPatch] = useState<PatchNote | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Combined red-dot count: server notifications + unread patch notes.
  const totalUnread = unreadCount + patchUnread;

  // When user clicks an announcement notification, show the dialog BUT keep the popover open
  const handleAnnouncementClick = useCallback((n: Notification) => {
    setSelectedAnnouncement(n);
    // Don't close popover - we want user to see other notifications after dismissing dialog
  }, []);

  // Patch notes are dismiss-only (never deletable): opening one marks it read.
  const handlePatchClick = useCallback(
    (note: PatchNote) => {
      setSelectedPatch(note);
      patchMarkRead(note.version);
    },
    [patchMarkRead]
  );

  const markEverythingRead = useCallback(() => {
    markAsRead();
    patchMarkAllRead();
  }, [markAsRead, patchMarkAllRead]);

  // When dialog closes, bring focus back to popover conceptually
  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) setSelectedAnnouncement(null);
  }, []);

  // Prevent popover from closing when a dialog is open
  const handlePopoverOpenChange = useCallback((open: boolean) => {
    // Only allow closing if no dialog is open
    if (!open && (selectedAnnouncement || selectedPatch)) return;
    setPopoverOpen(open);
  }, [selectedAnnouncement, selectedPatch]);

  const badge =
    totalUnread > 0 ? (
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
        {totalUnread > 9 ? "9+" : totalUnread}
      </span>
    ) : null;

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
          {badge}
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
          {badge}
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-semibold">{t("notification.title")}</h3>
          {totalUnread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={markEverythingRead}
            >
              <CheckCheck className="h-3 w-3" />
              {t("notification.read_all")}
            </Button>
          )}
        </div>
        <Separator />

        {/* List - bounded height with scroll */}
        <div className="max-h-[min(60vh,400px)] overflow-y-auto overscroll-contain">
          {/* Pinned "Update aplikasi" section - always present, dismiss-only */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Update aplikasi
            </p>
          </div>
          <div className="pb-1">
            {patchNotes.map((note) => {
              const unread = !patchIsRead(note.version);
              return (
                <button
                  key={note.version}
                  type="button"
                  onClick={() => handlePatchClick(note)}
                  className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                        v{note.version}
                      </span>
                      <span className="truncate text-xs font-semibold text-foreground">
                        {note.title}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 block text-[11px] text-muted-foreground">
                      {note.items[0]}
                    </span>
                  </span>
                  {unread && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" aria-label="Belum dibaca" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Server notifications - shown only when present. The patch-notes
              section above keeps the tab from ever looking empty, so there is no
              "no notifications yet" line. */}
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="py-1">
              <AnimatePresence initial={false}>
                {notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    variants={notificationSpring}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    drag="x"
                    dragSnapToOrigin
                    dragElastic={0.4}
                    onDragEnd={(_, info) => {
                      // Swipe a row far enough left/right to dismiss it. framer
                      // suppresses the trailing click, so a swipe never also
                      // activates the row.
                      if (Math.abs(info.offset.x) > 80) dismissNotification(notif.id);
                    }}
                  >
                    <NotificationItem
                      notification={notif}
                      onRead={(id) => markAsRead([id])}
                      onDismiss={dismissNotification}
                      onAnnouncementClick={handleAnnouncementClick}
                      variant="center"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              </div>
            </>
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

    {/* Patch note detail dialog */}
    <Dialog
      open={!!selectedPatch}
      onOpenChange={(open) => { if (!open) setSelectedPatch(null); }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            {selectedPatch?.title}
            {selectedPatch && (
              <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
                v{selectedPatch.version}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {selectedPatch && (
          <div className="space-y-3">
            <ul className="space-y-2">
              {selectedPatch.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {format(new Date(selectedPatch.date), "d MMMM yyyy", { locale: idLocale })}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
