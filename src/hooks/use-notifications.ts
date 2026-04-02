"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { sounds } from "@/lib/sounds";
import type { Notification } from "@/types";

export function useNotifications() {
  const { session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `/api/notifications?licenseKey=${encodeURIComponent(session.licenseKey)}`
      );
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Initial fetch
  useEffect(() => {
    if (session) {
      setIsLoading(true);
      fetchNotifications();
    }
  }, [fetchNotifications, session]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`notifications-${session.licenseKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `license_key=eq.${session.licenseKey}`,
        },
        (payload) => {
          const row = payload.new;
          const notif: Notification = {
            id: row.id,
            type: row.type,
            senderName: row.sender_name,
            preview: row.preview,
            context: row.context,
            threadId: row.thread_id,
            subjectId: row.subject_id,
            threadTitle: row.thread_title,
            messageId: row.message_id || null,
            read: row.read,
            createdAt: row.created_at,
          };
          setNotifications((prev) => [notif, ...prev]);
          // Play notification sound for mention/announcement
          sounds.notification();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  // Mark notifications as read
  const markAsRead = useCallback(
    async (notificationIds?: string[]) => {
      if (!session) return;
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            licenseKey: session.licenseKey,
            ...(notificationIds
              ? { notificationIds }
              : { markAll: true }),
          }),
        });

        setNotifications((prev) =>
          prev.map((n) =>
            !notificationIds || notificationIds.includes(n.id)
              ? { ...n, read: true }
              : n
          )
        );
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    },
    [session]
  );

  const dismissNotification = useCallback(
    async (notificationId: string) => {
      await markAsRead([notificationId]);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    },
    [markAsRead]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    dismissNotification,
    refetch: fetchNotifications,
  };
}
