import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isAdminFromSession } from "@/lib/auth/admin-guard";
import { requireScope, scopeEq, scopeColumns, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";
import { checkCooldown } from "@/lib/auth/cooldown";
import { capitalizeFirst } from "@/lib/name";
import { isUuid } from "@/lib/uuid";
import type { ForumComment } from "@/types";

// ─── Mock store for development without Supabase ───
const mockComments = new Map<string, ForumComment[]>();

function getMockComments(threadId: string): ForumComment[] {
  return mockComments.get(threadId) || [];
}

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── GET /api/forum/comments?threadId=xxx ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json(
        { error: "threadId is required" },
        { status: 400 }
      );
    }

    // Pinned/static threads carry a string id (e.g. "pinned-akuntansi-…"), but
    // forum_comments.thread_id is a uuid column — querying it with a non-uuid
    // 500s (22P02). These threads live in-repo and hold no DB comments → empty.
    if (!isUuid(threadId)) {
      return NextResponse.json({ comments: [] });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ comments: getMockComments(threadId) });
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("forum_comments")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(500)
    );

    if (error) throw error;

    const comments: ForumComment[] = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      threadId: row.thread_id as string,
      content: row.content as string,
      imageUrl: (row.image_url as string) || null,
      authorId: row.author_id as string,
      authorName: capitalizeFirst(row.author_name as string),
      authorClass: (row.author_class as string) || "",
      isAdmin: row.is_admin as boolean,
      isTester: (row.is_tester as boolean) ?? false,
      packageTier: (row.package_tier as ForumComment["packageTier"]) ?? "normal",
      parentCommentId: (row.parent_comment_id as string) || null,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum comments GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/forum/comments - Add comment or reply ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const {
      threadId,
      content,
      imageUrl,
      authorId,
      authorName,
      authorClass,
      parentCommentId,
    } = body;

    // Trust cookies, not client-provided flags
    const isAdmin = await isAdminFromSession();

    if (!threadId || (!content?.trim() && !imageUrl) || !authorId || !authorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if ((content || "").length > 5000) {
      return NextResponse.json({ error: "Comment too long (max 5000)" }, { status: 400 });
    }

    // Static/pinned threads (non-uuid id) are read-only curated content — the
    // uuid thread_id column can't store their id. Refuse cleanly (no 500).
    if (!isUuid(threadId)) {
      return NextResponse.json(
        { error: "Diskusi ini tidak menerima komentar." },
        { status: 400 }
      );
    }

    // Flood guard: gentle per-user cooldown on comment posting.
    const _lk = (await cookies()).get("hs-session")?.value?.toUpperCase();
    if (_lk) {
      const cd = checkCooldown(`forum-comment:${_lk}`, 1500);
      if (!cd.allowed) {
        return NextResponse.json(
          { error: "Tunggu sebentar." },
          { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
        );
      }
    }

    // Only accept Cloudinary image URLs (same policy as feedback route)
    let safeImageUrl: string | null = null;
    if (imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol === "https:" && parsed.hostname.includes("cloudinary.com")) {
          safeImageUrl = imageUrl;
        }
      } catch {
        /* drop invalid URL */
      }
    }

    if (!isSupabaseServerConfigured) {
      const comment: ForumComment = {
        id: crypto.randomUUID(),
        threadId,
        content: (content || "").trim(),
        imageUrl: safeImageUrl,
        authorId,
        authorName,
        authorClass: authorClass || "",
        isAdmin: isAdmin || false,
        isTester: body.isTester || false,
        packageTier: body.packageTier || "normal",
        parentCommentId: parentCommentId || null,
        createdAt: new Date().toISOString(),
      };
      const existing = getMockComments(threadId);
      mockComments.set(threadId, [...existing, comment]);
      return NextResponse.json({ comment });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("forum_comments")
      .insert({
        thread_id: threadId,
        content: (content || "").trim(),
        image_url: safeImageUrl,
        author_id: authorId,
        author_name: authorName,
        author_class: authorClass || "",
        is_admin: isAdmin || false,
        parent_comment_id: parentCommentId || null,
        ...scopeColumns(scope),
      })
      .select()
      .single();

    if (error) throw error;

    const comment: ForumComment = {
      id: data.id,
      threadId: data.thread_id,
      content: data.content,
      imageUrl: data.image_url || null,
      authorId: data.author_id,
      authorName: capitalizeFirst(data.author_name),
      authorClass: data.author_class,
      isAdmin: data.is_admin,
      isTester: data.is_tester ?? false,
      packageTier: data.package_tier ?? "normal",
      parentCommentId: data.parent_comment_id,
      createdAt: data.created_at,
    };

    // Send notifications for comment_reply (skip self-notifications)
    try {
      const notificationsToInsert: Array<{
        license_key: string;
        type: string;
        sender_name: string;
        preview: string;
        context: string;
        thread_id: string;
        subject_id: string | null;
        thread_title: string | null;
        semester: number;
        exam_period: string;
        jurusan: string;
      }> = [];

      const { data: threadData } = await scopeEq(scope)(
        supabase
          .from("forum_threads")
          .select("author_id, title, subject_id")
          .eq("id", threadId)
          .single()
      );

      const previewText = (content || "").trim().slice(0, 200);

      if (threadData && threadData.author_id !== authorId) {
        notificationsToInsert.push({
          license_key: threadData.author_id,
          type: "comment_reply",
          sender_name: authorName,
          preview: previewText,
          context: "forum",
          thread_id: threadId,
          subject_id: threadData.subject_id || null,
          thread_title: threadData.title || null,
          ...scopeColumns(scope),
        });
      }

      if (parentCommentId) {
        const { data: parentComment } = await scopeEq(scope)(
          supabase
            .from("forum_comments")
            .select("author_id")
            .eq("id", parentCommentId)
            .single()
        );

        if (
          parentComment &&
          parentComment.author_id !== authorId &&
          parentComment.author_id !== threadData?.author_id
        ) {
          notificationsToInsert.push({
            license_key: parentComment.author_id,
            type: "comment_reply",
            sender_name: authorName,
            preview: previewText,
            context: "forum",
            thread_id: threadId,
            subject_id: threadData?.subject_id || null,
            thread_title: threadData?.title || null,
            ...scopeColumns(scope),
          });
        }
      }

      if (notificationsToInsert.length > 0) {
        await supabase.from("notifications").insert(notificationsToInsert);
      }
    } catch (notifError) {
      console.error("Failed to create comment_reply notifications:", notifError);
    }

    return NextResponse.json({ comment });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum comments POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/forum/comments - Delete comment ───
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { commentId, requesterId } = body;
    const isAdmin = await isAdminFromSession();

    if (!commentId || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      for (const [threadId, comments] of mockComments.entries()) {
        const comment = comments.find((c) => c.id === commentId);
        if (comment) {
          if (comment.authorId !== requesterId && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
          mockComments.set(
            threadId,
            comments.filter(
              (c) => c.id !== commentId && c.parentCommentId !== commentId
            )
          );
          break;
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    if (!isAdmin) {
      const { data: comment } = await scopeEq(scope)(
        supabase
          .from("forum_comments")
          .select("author_id")
          .eq("id", commentId)
          .single()
      );

      if (!comment || comment.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await scopeEq(scope)(
      supabase
        .from("forum_comments")
        .delete()
        .eq("id", commentId)
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Forum comments DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
