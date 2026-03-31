"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { RATE_LIMITS } from "@/lib/constants";
import { getDeviceId } from "@/lib/auth/device";
import type { ForumComment } from "@/types";

/**
 * Nest flat comments into a tree structure (1 level of replies).
 */
function nestComments(flat: ForumComment[]): ForumComment[] {
  const topLevel: ForumComment[] = [];
  const repliesMap = new Map<string, ForumComment[]>();

  for (const comment of flat) {
    if (comment.parentCommentId) {
      const existing = repliesMap.get(comment.parentCommentId) || [];
      existing.push(comment);
      repliesMap.set(comment.parentCommentId, existing);
    } else {
      topLevel.push({ ...comment, replies: [] });
    }
  }

  for (const parent of topLevel) {
    parent.replies = repliesMap.get(parent.id) || [];
  }

  return topLevel;
}

export function useComments(threadId: string | null) {
  const { session } = useSession();
  const [flatComments, setFlatComments] = useState<ForumComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastCommentTime = useRef(0);
  const lastReplyTime = useRef(0);

  const comments = useMemo(() => nestComments(flatComments), [flatComments]);

  const fetchComments = useCallback(async () => {
    if (!threadId) return;
    try {
      const res = await fetch(
        `/api/forum/comments?threadId=${encodeURIComponent(threadId)}`
      );
      const data = await res.json();
      if (data.comments) setFlatComments(data.comments);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [threadId]);

  // Initial fetch
  useEffect(() => {
    if (!threadId) {
      setFlatComments([]);
      return;
    }
    setIsLoading(true);
    fetchComments();
  }, [threadId, fetchComments]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!threadId || !isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`forum-comments-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_comments",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new;
            const comment: ForumComment = {
              id: row.id,
              threadId: row.thread_id,
              content: row.content,
              imageUrl: row.image_url || null,
              authorId: row.author_id,
              authorName: row.author_name,
              authorClass: row.author_class,
              isAdmin: row.is_admin,
              isTester: row.is_tester ?? false,
              packageTier: row.package_tier ?? "normal",
              parentCommentId: row.parent_comment_id,
              createdAt: row.created_at,
            };
            setFlatComments((prev) => [...prev, comment]);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old;
            setFlatComments((prev) =>
              prev.filter(
                (c) => c.id !== row.id && c.parentCommentId !== row.id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  const addComment = useCallback(
    async (content: string, parentCommentId?: string, imageUrl?: string) => {
      if (!session || !threadId) return;

      // Rate limit check
      const now = Date.now();
      const isReply = !!parentCommentId;
      const cooldown = isReply
        ? RATE_LIMITS.REPLY_COOLDOWN_MS
        : RATE_LIMITS.COMMENT_COOLDOWN_MS;
      const lastTime = isReply
        ? lastReplyTime.current
        : lastCommentTime.current;

      if (now - lastTime < cooldown) {
        throw new Error("Tunggu sebentar sebelum mengirim komentar");
      }

      const deviceId = await getDeviceId();
      const res = await fetch("/api/forum/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          content,
          imageUrl: imageUrl || null,
          authorId: deviceId,
          authorName: session.name,
          authorClass: session.selectedClass,
          isAdmin: session.isAdmin,
          parentCommentId: parentCommentId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengirim komentar");
      }

      if (isReply) {
        lastReplyTime.current = Date.now();
      } else {
        lastCommentTime.current = Date.now();
      }

      if (!isSupabaseConfigured) {
        await fetchComments();
      }
    },
    [session, threadId, fetchComments]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!session) return;
      const deviceId = await getDeviceId();
      const res = await fetch("/api/forum/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          requesterId: deviceId,
          isAdmin: session.isAdmin,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menghapus komentar");
      }

      if (!isSupabaseConfigured) {
        setFlatComments((prev) =>
          prev.filter(
            (c) => c.id !== commentId && c.parentCommentId !== commentId
          )
        );
      }
    },
    [session]
  );

  return { comments, isLoading, addComment, deleteComment };
}
