import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { ForumThread } from "@/types";

// ─── Mock store for development without Supabase ───
const mockThreads = new Map<string, ForumThread[]>();

function getMockThreads(subjectId: string): ForumThread[] {
  return mockThreads.get(subjectId) || [];
}

// ─── GET /api/forum/threads?subjectId=xxx ───
export async function GET(request: Request) {
  try {
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
    const { data, error } = await supabase
      .from("forum_threads")
      .select("*")
      .eq("subject_id", subjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const threads: ForumThread[] = (data || []).map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      title: row.title,
      content: row.content,
      authorId: row.author_id,
      authorName: row.author_name,
      authorClass: row.author_class,
      isAdmin: row.is_admin,
      isTester: row.is_tester || false,
      packageTier: row.package_tier || undefined,
      imageUrl: row.image_url,
      mediaUrl: row.media_url,
      closed: row.closed,
      commentCount: row.comment_count,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Forum threads GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/forum/threads - Create thread ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      subjectId,
      title,
      content,
      authorId,
      authorName,
      authorClass,
      isAdmin,
      isTester,
      packageTier,
      imageUrl,
      mediaUrl,
    } = body;

    if (!subjectId || !title?.trim() || !authorId || !authorName) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
      authorName: data.author_name,
      authorClass: data.author_class,
      isAdmin: data.is_admin,
      isTester: data.is_tester || false,
      packageTier: data.package_tier || undefined,
      imageUrl: data.image_url,
      mediaUrl: data.media_url,
      closed: data.closed,
      commentCount: data.comment_count,
      createdAt: data.created_at,
    };

    // Notify users who have participated in this subject's forum before
    try {
      // Find distinct authors from threads and comments in the same subject
      const { data: threadAuthors } = await supabase
        .from("forum_threads")
        .select("author_id")
        .eq("subject_id", subjectId)
        .neq("author_id", authorId);

      const { data: commentAuthors } = await supabase
        .from("forum_comments")
        .select("author_id, forum_threads!inner(subject_id)")
        .eq("forum_threads.subject_id", subjectId)
        .neq("author_id", authorId);

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
        }));

        await supabase.from("notifications").insert(notificationRows);
      }
    } catch (notifError) {
      console.error("Failed to create forum_thread notifications:", notifError);
    }

    return NextResponse.json({ thread });
  } catch (error) {
    console.error("Forum threads POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/forum/threads - Delete thread ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { threadId, requesterId, isAdmin } = body;

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

    // Verify ownership or admin
    if (!isAdmin) {
      const { data: thread } = await supabase
        .from("forum_threads")
        .select("author_id")
        .eq("id", threadId)
        .single();

      if (!thread || thread.author_id !== requesterId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from("forum_threads")
      .delete()
      .eq("id", threadId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forum threads DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/forum/threads - Close/reopen thread (admin only) ───
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { threadId, closed, isAdmin } = body;

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
    const { error } = await supabase
      .from("forum_threads")
      .update({ closed })
      .eq("id", threadId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forum threads PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
