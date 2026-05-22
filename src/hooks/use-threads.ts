"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { forumThreadsChannel, scopeRealtimeFilter } from "@/lib/realtime/channels";
import { DEFAULT_SCOPE } from "@/lib/scope";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import { loadPinnedThreads } from "@/data";
import type { ForumThread } from "@/types";

export function useThreads(subjectId: string) {
  const { session } = useSession();
  const scopeCtx = useOptionalScope();
  const scope = scopeCtx?.scope ?? DEFAULT_SCOPE;
  const [dbThreads, setDbThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedThreads, setPinnedThreads] = useState<ForumThread[]>([]);
  const lastPostTime = useRef(0);

  // Pinned threads are scope-locked: a UAS subject never sees pinned threads
  // authored for UTS, and vice versa.
  useEffect(() => {
    let cancelled = false;
    loadPinnedThreads(scope, subjectId)
      .then((list) => {
        if (cancelled) return;
        setPinnedThreads(Array.isArray(list) ? (list as ForumThread[]) : []);
      })
      .catch(() => {
        if (!cancelled) setPinnedThreads([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, subjectId]);

  // Pinned threads are prepended and shadow any DB row with the same id.
  const threads = useMemo<ForumThread[]>(() => {
    if (pinnedThreads.length === 0) return dbThreads;
    const pinnedIds = new Set(pinnedThreads.map((t) => t.id));
    return [...pinnedThreads, ...dbThreads.filter((t) => !pinnedIds.has(t.id))];
  }, [pinnedThreads, dbThreads]);

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/forum/threads?subjectId=${encodeURIComponent(subjectId)}`
      );
      const data = await res.json();
      if (data.threads) setDbThreads(data.threads);
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
      .channel(forumThreadsChannel(scope, subjectId))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_threads",
          filter: scopeRealtimeFilter(scope),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            // Cross-check scope + subject (filter only narrows by semester)
            if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan) return;
            if (row.subject_id !== subjectId) return;
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
              attachments: row.attachments || undefined,
              closed: row.closed,
              commentCount: row.comment_count,
              createdAt: row.created_at,
            };
            setDbThreads((prev) => [thread, ...prev.filter((t) => t.id !== thread.id)]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new;
            if (row.exam_period !== scope.examPeriod || row.jurusan !== scope.jurusan) return;
            if (row.subject_id !== subjectId) return;
            setDbThreads((prev) =>
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
            setDbThreads((prev) => prev.filter((t) => t.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subjectId, scope]);

  const createThread = useCallback(
    async (data: {
      title: string;
      content: string;
      imageUrl?: string;
      mediaUrl?: string;
      attachments?: import("@/types").Attachment[];
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
          attachments: data.attachments || null,
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
        setDbThreads((prev) => prev.filter((t) => t.id !== threadId));
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
        setDbThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, closed } : t))
        );
      }
    },
    [session]
  );

  return { threads, isLoading, createThread, deleteThread, closeThread };
}
