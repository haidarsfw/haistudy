"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import type { ForumThread } from "@/types";

export function useThreads(subjectId: string) {
  const { session } = useSession();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastPostTime = useRef(0);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/forum/threads?subjectId=${encodeURIComponent(subjectId)}`
      );
      const data = await res.json();
      if (data.threads) setThreads(data.threads);
    } catch (error) {
      console.error("Failed to fetch threads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [subjectId]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    fetchThreads();
  }, [fetchThreads]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`forum-threads-${subjectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_threads",
          filter: `subject_id=eq.${subjectId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            const thread: ForumThread = {
              id: row.id,
              subjectId: row.subject_id,
              title: row.title,
              content: row.content,
              authorId: row.author_id,
              authorName: row.author_name,
              authorClass: row.author_class,
              isAdmin: row.is_admin,
              isTester: row.is_tester ?? false,
              packageTier: row.package_tier ?? "normal",
              imageUrl: row.image_url,
              mediaUrl: row.media_url,
              closed: row.closed,
              commentCount: row.comment_count,
              createdAt: row.created_at,
            };
            setThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new;
            setThreads((prev) =>
              prev.map((t) =>
                t.id === row.id
                  ? {
                      ...t,
                      closed: row.closed,
                      commentCount: row.comment_count,
                      title: row.title,
                      content: row.content,
                    }
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old;
            setThreads((prev) => prev.filter((t) => t.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subjectId]);

  const createThread = useCallback(
    async (data: {
      title: string;
      content: string;
      imageUrl?: string;
      mediaUrl?: string;
    }) => {
      if (!session) return;

      // Rate limit check
      const now = Date.now();
      if (now - lastPostTime.current < RATE_LIMITS.THREAD_COOLDOWN_MS) {
        throw new Error("Tunggu sebentar sebelum membuat thread baru");
      }

      const deviceId = await getDeviceId();
      const res = await fetch("/api/forum/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          title: data.title,
          content: data.content,
          authorId: deviceId,
          authorName: session.name,
          authorClass: session.selectedClass,
          isAdmin: session.isAdmin,
          imageUrl: data.imageUrl || null,
          mediaUrl: data.mediaUrl || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat thread");
      }

      lastPostTime.current = Date.now();

      // In mock mode, refetch to get latest
      if (!isSupabaseConfigured) {
        await fetchThreads();
      }
    },
    [session, subjectId, fetchThreads]
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!session) return;
      const deviceId = await getDeviceId();
      const res = await fetch("/api/forum/threads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          requesterId: deviceId,
          isAdmin: session.isAdmin,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus thread");
      }

      if (!isSupabaseConfigured) {
        setThreads((prev) => prev.filter((t) => t.id !== threadId));
      }
    },
    [session]
  );

  const closeThread = useCallback(
    async (threadId: string, closed: boolean) => {
      if (!session?.isAdmin) return;
      const res = await fetch("/api/forum/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, closed, isAdmin: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengubah status thread");
      }

      if (!isSupabaseConfigured) {
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, closed } : t))
        );
      }
    },
    [session]
  );

  return { threads, isLoading, createThread, deleteThread, closeThread };
}
