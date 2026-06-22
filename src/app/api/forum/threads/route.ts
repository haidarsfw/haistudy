import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { requireScope, scopeEq, scopeColumns, ScopeError, assertNotPreview } from "@/lib/auth/scope-check";
import { capitalizeFirst } from "@/lib/name";
import type { ForumThread, Attachment } from "@/types";

// Bound stored attachment data. Anything outside this shape is dropped rather
// than persisted raw (URL length cap guards against oversized/abusive values).
const ALLOWED_ATTACHMENT_TYPES = [
  "image",
  "youtube",
  "google-slides",
  "google-pdf",
  "link",
];
const MAX_URL_LEN = 2000;

function sanitizeAttachments(input: unknown): Attachment[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const cleaned = (input as Attachment[])
    .filter(
      (a) =>
        a &&
        typeof a.url === "string" &&
        a.url.length > 0 &&
        a.url.length <= MAX_URL_LEN &&
        ALLOWED_ATTACHMENT_TYPES.includes(a.type as string)
    )
    .slice(0, 5)
    .map((a) => ({
      type: a.type,
      url: a.url.slice(0, MAX_URL_LEN),
      ...(typeof a.label === "string" ? { label: a.label.slice(0, 200) } : {}),
    }));
  return cleaned.length > 0 ? cleaned : null;
}

// ─── Mock store for development without Supabase ───
const mockThreads = new Map<string, ForumThread[]>();

function getMockThreads(subjectId: string): ForumThread[] {
  return mockThreads.get(subjectId) || [];
}

// ─── GET /api/forum/threads?subjectId=xxx ───
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");

    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ threads: getMockThreads(subjectId) });
    }

    const supabase = createServerClient()!;
    const { data, error } = await scopeEq(scope)(
      supabase
        .from("forum_threads")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false })
        .limit(100)
    );

    if (error) throw error;

    const threads: ForumThread[] = ((data ?? []) as Record<string, unknown>[]).map((row) => {
      // Build attachments from new column or fall back to legacy
      let attachments: Attachment[] | undefined;
      if (row.attachments && Array.isArray(row.attachments) && row.attachments.length > 0) {
        attachments = row.attachments as Attachment[];
      } else {
        const legacy: Attachment[] = [];
        if (row.image_url) legacy.push({ type: "image", url: row.image_url as string });
        if (row.media_url) {
          // Detect type from URL
          const url = row.media_url as string;
          let type: Attachment["type"] = "link";
          if (url.includes("youtube.com") || url.includes("youtu.be")) type = "youtube";
          else if (url.includes("docs.google.com/presentation")) type = "google-slides";
          else if (url.includes("drive.google.com/file") || url.includes("docs.google.com/document") || url.includes("docs.google.com/spreadsheets")) type = "google-pdf";
          legacy.push({ type, url });
        }
        if (legacy.length > 0) attachments = legacy;
      }

      return {
        id: row.id as string,
        subjectId: row.subject_id as string,
        title: row.title as string,
        content: row.content as string,
        authorId: row.author_id as string,
        authorName: capitalizeFirst(row.author_name as string),
        authorClass: (row.author_class as string) || "",
        isAdmin: row.is_admin as boolean,
        isTester: (row.is_tester as boolean) || false,
        packageTier: (row.package_tier as ForumThread["packageTier"]) || undefined,
        imageUrl: (row.image_url as string) || null,
        mediaUrl: (row.media_url as string) || null,
        attachments,
        closed: row.closed as boolean,
        commentCount: row.comment_count as number,
        createdAt: row.created_at as string,
      };
    });

    return NextResponse.json({ threads });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Forum threads GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/forum/threads - Create thread ───
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const {
      subjectId,
      title,
      content,
      authorId,
      authorName,
      authorClass,
      isTester,
      packageTier,
      imageUrl,
      mediaUrl,
      attachments,
    } = body;

    // Validate + sanitize attachments (type allowlist + URL length cap).
    const validAttachments = sanitizeAttachments(attachments);

    // Trust cookies, not client-provided flags
    const isAdmin = await isAdminFromCookies();

    if (!subjectId || !title?.trim() || !authorId || !authorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (title.length > 200 || (content || "").length > 10_000) {
      return NextResponse.json(
        { error: "Title max 200, content max 10000 characters" },
        { status: 400 }
      );
    }

    if ((imageUrl || "").length > MAX_URL_LEN || (mediaUrl || "").length > MAX_URL_LEN) {
      return NextResponse.json(
        { error: "URL too long" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const thread: ForumThread = {
        id: crypto.randomUUID(),
        subjectId,
        title: title.trim(),
        content: (content || "").trim(),
        authorId,
        authorName,
        authorClass: authorClass || "",
        isAdmin: isAdmin || false,
        isTester: isTester || false,
        packageTier: packageTier || undefined,
        imageUrl: imageUrl || null,
        mediaUrl: mediaUrl || null,
        attachments: validAttachments || undefined,
        closed: false,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };
      const existing = getMockThreads(subjectId);
      mockThreads.set(subjectId, [thread, ...existing]);
      return NextResponse.json({ thread });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("forum_threads")
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        content: (content || "").trim(),
        author_id: authorId,
        author_name: authorName,
        author_class: authorClass || "",
        is_admin: isAdmin || false,
        is_tester: isTester || false,
        package_tier: packageTier || null,
        image_url: imageUrl || null,
        media_url: mediaUrl || null,
        ...(validAttachments ? { attachments: validAttachments } : {}),
        ...scopeColumns(scope),
      })
      .select()
      .single();

    if (error) throw error;

    const thread: ForumThread = {
      id: data.id,
      subjectId: data.subject_id,
      title: data.title,
      content: data.content,
      authorId: data.author_id,
      authorName: capitalizeFirst(data.author_name),
      authorClass: data.author_class,
      isAdmin: data.is_admin,
      isTester: data.is_tester || false,
      packageTier: data.package_tier || undefined,
      imageUrl: data.image_url,
      mediaUrl: data.media_url,
      attachments: data.attachments || undefined,
      closed: data.closed,
      commentCount: data.comment_count,
      createdAt: data.created_at,
    };

    // Notify users who have participated in this subject's forum before
    try {
      // Find distinct authors from threads and comments in the same subject + scope
      const { data: threadAuthors } = await scopeEq(scope)(
        supabase
          .from("forum_threads")
          .select("author_id")
          .eq("subject_id", subjectId)
          .neq("author_id", authorId)
      );

      const { data: commentAuthors } = await scopeEq(scope)(
        supabase
          .from("forum_comments")
          .select("author_id, forum_threads!inner(subject_id)")
          .eq("forum_threads.subject_id", subjectId)
          .neq("author_id", authorId)
      );

      const participantIds = new Set<string>();
      if (threadAuthors) {
        for (const t of threadAuthors) participantIds.add(t.author_id);
      }
      if (commentAuthors) {
        for (const c of commentAuthors) participantIds.add(c.author_id);
      }

      if (participantIds.size > 0) {
        const notificationRows = Array.from(participantIds).map((licenseKey) => ({
          license_key: licenseKey,
          type: "forum_thread" as const,
          sender_name: authorName,
          preview: title.trim().slice(0, 200),
          context: "forum" as const,
          thread_id: thread.id,
          subject_id: subjectId,
          thread_title: title.trim(),
          ...scopeColumns(scope),
        }));

        await supabase.from("notifications").insert(notificationRows);
      }
    } catch (notifError) {
      console.error("Failed to create forum_thread notifications:", notifError);
    }

    return NextResponse.json({ thread });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Forum threads POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/forum/threads - Delete thread ───
export async function DELETE(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { threadId, requesterId } = body;
    const isAdmin = await isAdminFromCookies();

    if (!threadId || !requesterId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      for (const [subjectId, threads] of mockThreads.entries()) {
        const thread = threads.find((t) => t.id === threadId);
        if (thread) {
          if (thread.authorId !== requesterId && !isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
          mockThreads.set(
            subjectId,
            threads.filter((t) => t.id !== threadId)
          );
          break;
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    // Verify ownership or admin (scoped)
    if (!isAdmin) {
      const { data: thread } = await scopeEq(scope)(
        supabase
          .from("forum_threads")
          .select("author_id")
          .eq("id", threadId)
          .single()
      );

      if (!thread || thread.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await scopeEq(scope)(
      supabase
        .from("forum_threads")
        .delete()
        .eq("id", threadId)
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Forum threads DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/forum/threads - Close/reopen thread (admin only) ───
export async function PATCH(request: Request) {
  try {
    const scope = await requireScope(request);
    await assertNotPreview();
    const body = await request.json();
    const { threadId, closed } = body;
    const isAdmin = await isAdminFromCookies();

    if (!threadId || closed === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin only" },
        { status: 403 }
      );
    }

    if (!isSupabaseServerConfigured) {
      for (const threads of mockThreads.values()) {
        const thread = threads.find((t) => t.id === threadId);
        if (thread) {
          thread.closed = closed;
          break;
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await scopeEq(scope)(
      supabase
        .from("forum_threads")
        .update({ closed })
        .eq("id", threadId)
    );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Forum threads PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
