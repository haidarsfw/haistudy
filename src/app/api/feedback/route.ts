import { NextRequest, NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export interface FeedbackItem {
  id: string;
  licenseKey: string;
  name: string;
  category: "bug" | "feature" | "other";
  message: string;
  imageUrls: string[];
  status: "unread" | "read" | "resolved";
  createdAt: string;
}

// In-memory fallback for local dev without Supabase
const feedbackStore: FeedbackItem[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (!isSupabaseServerConfigured) {
    if (searchParams.get("countUnread") === "true") {
      return NextResponse.json({ unreadCount: feedbackStore.filter((f) => f.status === "unread").length });
    }
    return NextResponse.json(
      feedbackStore.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }

  const supabase = createServerClient()!;

  if (searchParams.get("countUnread") === "true") {
    const { count } = await supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("status", "unread");
    return NextResponse.json({ unreadCount: count || 0 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

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
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, name, category, message, action, feedbackId } = body;

    // Admin action: clear all feedback
    if (action === "clearAll") {
      if (!isSupabaseServerConfigured) {
        feedbackStore.length = 0;
        return NextResponse.json({ success: true });
      }

      const supabase = createServerClient()!;
      const { error } = await supabase
        .from("feedback")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows
      if (error) {
        console.error("Feedback clearAll error:", error);
        return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    // Admin actions: mark as read/resolved
    if (action === "updateStatus" && feedbackId) {
      if (!isSupabaseServerConfigured) {
        const item = feedbackStore.find((f) => f.id === feedbackId);
        if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
        item.status = body.status || "read";
        return NextResponse.json(item);
      }

      const supabase = createServerClient()!;
      const { data, error } = await supabase
        .from("feedback")
        .update({ status: body.status || "read" })
        .eq("id", feedbackId)
        .select()
        .single();

      if (error) {
        console.error("Feedback update error:", error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    // Submit new feedback
    if (!licenseKey || !message || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const feedback: FeedbackItem = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        licenseKey,
        name: name || "Anonymous",
        category,
        message: message.slice(0, 1000),
        imageUrls: body.imageUrls || [],
        status: "unread",
        createdAt: new Date().toISOString(),
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
        image_urls: body.imageUrls || [],
        status: "unread",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
