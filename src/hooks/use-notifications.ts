"use client";

import {
  createContext,
  createElement,
  useState,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { notificationsChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { sounds } from "@/lib/sounds";
import { whenIdle } from "@/lib/defer";
import type { Notification } from "@/types";

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationIds?: string[]) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Mount once per authenticated app shell. Holds a single Realtime subscription
 * + a single initial fetch; every `useNotifications()` consumer reads from
 * the shared context. Previously each consumer call ran its own fetch +
 * subscription - 6 callsites = 6 WebSockets per page load.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
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

  // Supabase Realtime subscription - deferred to idle so it doesn't compete
  // with FCP/LCP. Initial state still comes from the synchronous fetch above.
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    let cleanup: (() => void) | null = null;
    const cancelIdle = whenIdle(() => {
      const supabase = createClient();
      if (!supabase) return;

      const channel = supabase
        .channel(notificationsChannel(scope, session.licenseKey))
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: scopeRealtimeFilter(scope),
          },
          (payload) => {
            const row = payload.new;
            // Realtime filter is semester-only; ensure this notification is
            // actually for THIS user in THIS scope (no cross-user/cross-scope).
            if (
              row.license_key !== session.licenseKey ||
              row.exam_period !== scope.examPeriod ||
              row.jurusan !== scope.jurusan
            ) {
              return;
            }
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

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    });
    return () => {
      cancelIdle();
      cleanup?.();
    };
  }, [session, scope]);

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
            ...(notificationIds ? { notificationIds } : { markAll: true }),
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

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      markAsRead,
      dismissNotification,
      refetch: fetchNotifications,
    }),
    [notifications, unreadCount, isLoading, markAsRead, dismissNotification, fetchNotifications]
  );

  return createElement(NotificationsContext.Provider, { value }, children);
}

/**
 * Reader hook. When called outside a NotificationsProvider, returns a stable
 * empty stub - keeps landing/admin pages and tests working without forcing
 * the provider on every tree.
 */
const EMPTY_VALUE: NotificationsContextValue = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  markAsRead: async () => {},
  dismissNotification: async () => {},
  refetch: async () => {},
};

export function useNotifications(): NotificationsContextValue {
  return useContext(NotificationsContext) ?? EMPTY_VALUE;
}
