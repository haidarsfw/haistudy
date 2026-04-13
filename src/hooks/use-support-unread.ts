"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "@/components/providers/session-provider";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const STORAGE_KEY = "hs-support-last-read";

/**
 * Tracks unread support messages.
 * - For users: counts admin messages since last time they opened the support panel
 * - For admins: counts total unread user messages across ALL conversations
 */
export function useSupportUnread() {
  const { session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const isPanelOpenRef = useRef(false);

  // Get the stored last-read timestamp
  const getLastRead = useCallback((): string | null => {
    if (!session?.licenseKey) return null;
    try {
      return localStorage.getItem(`${STORAGE_KEY}-${session.licenseKey}`);
    } catch {
      return null;
    }
  }, [session?.licenseKey]);

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    if (!session?.licenseKey) return;

    try {
      if (session.isAdmin) {
        // Admin: fetch total unread across all conversations
        const res = await fetch("/api/support?all=true");
        if (res.ok) {
          const data = await res.json();
          const total = (data.conversations || []).reduce(
            (sum: number, c: { unread_count: number }) => sum + (c.unread_count || 0),
            0
          );
          setUnreadCount(total);
        }
      } else {
        // User: count admin messages since last read
        const res = await fetch(`/api/support?licenseKey=${session.licenseKey}`);
        if (res.ok) {
          const data = await res.json();
          const messages = data.messages || [];
          const lastRead = getLastRead();
          
          if (!lastRead) {
            // Never opened support — count all admin messages
            const adminMsgs = messages.filter(
              (m: { is_admin: boolean; is_system?: boolean }) => m.is_admin && !m.is_system
            );
            setUnreadCount(adminMsgs.length);
          } else {
            const lastReadTime = new Date(lastRead).getTime();
            const unread = messages.filter(
              (m: { is_admin: boolean; is_system?: boolean; created_at: string }) =>
                m.is_admin && !m.is_system && new Date(m.created_at).getTime() > lastReadTime
            );
            setUnreadCount(unread.length);
          }
        }
      }
    } catch {
      // silent
    }
  }, [session?.licenseKey, session?.isAdmin, getLastRead]);

  // Initial fetch + poll every 120s
  useEffect(() => {
    if (!session?.licenseKey) return;

    fetchUnread();
    const interval = setInterval(fetchUnread, 120_000);
    return () => clearInterval(interval);
  }, [session?.licenseKey, fetchUnread]);

  // Listen for realtime support messages to update count
  useEffect(() => {
    if (!session?.licenseKey || !isSupabaseConfigured) return;

    const supabase = createClient();
    if (!supabase) return;

    const filter = session.isAdmin
      ? undefined // Admin listens to ALL support messages
      : `license_key=eq.${session.licenseKey}`;

    const channel = supabase
      .channel("support-unread-counter")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const msg = payload.new as {
            is_admin: boolean;
            is_system?: boolean;
            sender_name: string;
            license_key: string;
          };

          if (session.isAdmin) {
            // Admin: count new USER messages (not admin/system)
            if (!msg.is_admin && !msg.is_system) {
              if (!isPanelOpenRef.current) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          } else {
            // User: count new ADMIN messages
            if (msg.is_admin && !msg.is_system) {
              if (!isPanelOpenRef.current) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.licenseKey, session?.isAdmin]);

  // Mark as read when support panel is opened
  const markAsRead = useCallback(() => {
    if (!session?.licenseKey) return;
    isPanelOpenRef.current = true;
    setUnreadCount(0);
    try {
      localStorage.setItem(
        `${STORAGE_KEY}-${session.licenseKey}`,
        new Date().toISOString()
      );
    } catch {}
  }, [session?.licenseKey]);

  // Call when panel closes
  const markPanelClosed = useCallback(() => {
    isPanelOpenRef.current = false;
  }, []);

  return { unreadCount, markAsRead, markPanelClosed };
}
