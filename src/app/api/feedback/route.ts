import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAdminFromCookies } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { requireScope, scopeColumns, ScopeError } from "@/lib/auth/scope-check";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

export interface FeedbackItem {
  id: string;
  licenseKey: string;
  name: string;
  category: "bug" | "feature" | "other";
  message: string;
  imageUrls: string[];
  status: "unread" | "read" | "resolved";
  createdAt: string;
  semester: number;
  examPeriod: "uts" | "uas";
  jurusan: string;
}

// In-memory fallback for local dev without Supabase
const feedbackStore: FeedbackItem[] = [];

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdminFromCookies())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const resolved = await resolveAdminScope(req);

    const { searchParams } = new URL(req.url);

    if (!isSupabaseServerConfigured) {
      const inScope = (items: FeedbackItem[]) => {
        if (resolved.mode === "all") return items;
        return items.filter(
          (i) =>
            i.semester === resolved.scope.semester &&
            i.examPeriod === resolved.scope.examPeriod &&
            i.jurusan === resolved.scope.jurusan
        );
      };
      if (searchParams.get("countUnread") === "true") {
        return NextResponse.json({
          unreadCount: inScope(feedbackStore).filter((f) => f.status === "unread").length,
        });
      }
      return NextResponse.json(
        inScope(feedbackStore).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    }

    const supabase = createServerClient()!;

    if (searchParams.get("countUnread") === "true") {
      let q = supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread");
      if (resolved.mode === "scoped") {
        q = q
          .eq("semester", resolved.scope.semester)
          .eq("exam_period", resolved.scope.examPeriod)
          .eq("jurusan", resolved.scope.jurusan);
      }
      const { count } = await q;
      return NextResponse.json({ unreadCount: count || 0 });
    }

    let q = supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data, error } = await q;

    if (error) {
      console.error("Feedback fetch error:", error);
      return NextResponse.json([], { status: 500 });
    }

    const mapped: FeedbackItem[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      licenseKey: (row.license_key as string) || "",
      name: (row.name as string) || "Anonymous",
      category: (row.category as FeedbackItem["category"]) || "other",
      message: (row.message as string) || "",
      imageUrls: (row.image_urls as string[]) || [],
      status: (row.status as FeedbackItem["status"]) || "unread",
      createdAt: (row.created_at as string) || new Date().toISOString(),
      semester: (row.semester as number) ?? 2,
      examPeriod: (row.exam_period as "uts" | "uas") ?? "uts",
      jurusan: (row.jurusan as string) ?? "bm",
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Feedback GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, name, category, message, action, feedbackId } = body;

    // Admin action: clear all feedback in current admin scope (or cross-scope if allPeriods)
    if (action === "clearAll") {
      if (!(await isAdminFromCookies())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const resolved = await resolveAdminScope(req);

      if (!isSupabaseServerConfigured) {
        if (resolved.mode === "all") {
          feedbackStore.length = 0;
        } else {
          const kept = feedbackStore.filter(
            (f) =>
              !(
                f.semester === resolved.scope.semester &&
                f.examPeriod === resolved.scope.examPeriod &&
                f.jurusan === resolved.scope.jurusan
              )
          );
          feedbackStore.length = 0;
          feedbackStore.push(...kept);
        }
        return NextResponse.json({ success: true });
      }

      const supabase = createServerClient()!;
      let q = supabase
        .from("feedback")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (resolved.mode === "scoped") {
        q = q
          .eq("semester", resolved.scope.semester)
          .eq("exam_period", resolved.scope.examPeriod)
          .eq("jurusan", resolved.scope.jurusan);
      }
      const { error } = await q;
      if (error) {
        console.error("Feedback clearAll error:", error);
        return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Admin actions: mark as read/resolved
    if (action === "updateStatus" && feedbackId) {
      if (!(await isAdminFromCookies())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const resolved = await resolveAdminScope(req);

      if (!isSupabaseServerConfigured) {
        const item = feedbackStore.find((f) => f.id === feedbackId);
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (
          resolved.mode === "scoped" &&
          (item.semester !== resolved.scope.semester ||
            item.examPeriod !== resolved.scope.examPeriod ||
            item.jurusan !== resolved.scope.jurusan)
        ) {
          return NextResponse.json({ error: "Feedback tidak ada di scope ini" }, { status: 404 });
        }
        item.status = body.status || "read";
        return NextResponse.json(item);
      }

      const supabase = createServerClient()!;
      let q = supabase
        .from("feedback")
        .update({ status: body.status || "read" })
        .eq("id", feedbackId);
      if (resolved.mode === "scoped") {
        q = q
          .eq("semester", resolved.scope.semester)
          .eq("exam_period", resolved.scope.examPeriod)
          .eq("jurusan", resolved.scope.jurusan);
      }
      const { data, error } = await q.select().single();

      if (error) {
        console.error("Feedback update error:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Submit new feedback (user) — scope is user's own cookie scope (NOT admin-overridable).
    if (!licenseKey || !message || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const scope = await requireScope(req);

    // Validate image URLs — only allow Cloudinary HTTPS URLs, max 3
    const imageUrls = (body.imageUrls || [])
      .filter((url: unknown): url is string => typeof url === "string")
      .filter((url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === "https:" && parsed.hostname.includes("cloudinary.com");
        } catch { return false; }
      })
      .slice(0, 3);

    if (!isSupabaseServerConfigured) {
      const feedback: FeedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        licenseKey,
        name: name || "Anonymous",
        category,
        message: message.slice(0, 1000),
        imageUrls,
        status: "unread",
        createdAt: new Date().toISOString(),
        semester: scope.semester,
        examPeriod: scope.examPeriod,
        jurusan: scope.jurusan,
      };
      feedbackStore.push(feedback);
      return NextResponse.json({ success: true, id: feedback.id });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("feedback")
      .insert({
        license_key: licenseKey,
        name: name || "Anonymous",
        category,
        message: message.slice(0, 1000),
        image_urls: imageUrls,
        status: "unread",
        ...scopeColumns(scope),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
