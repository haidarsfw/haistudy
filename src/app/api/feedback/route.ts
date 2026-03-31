import { NextRequest, NextResponse } from "next/server";

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

// In-memory store (would use Supabase in production)
const feedbackStore: FeedbackItem[] = [];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Return just the unread count for badge display
  if (searchParams.get("countUnread") === "true") {
    const unreadCount = feedbackStore.filter((f) => f.status === "unread").length;
    return NextResponse.json({ unreadCount });
  }

  return NextResponse.json(feedbackStore.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { licenseKey, name, category, message, action, feedbackId } = body;

    // Admin actions: mark as read/resolved
    if (action === "updateStatus" && feedbackId) {
      const item = feedbackStore.find((f) => f.id === feedbackId);
      if (!item) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      item.status = body.status || "read";
      return NextResponse.json(item);
    }

    // Submit new feedback
    if (!licenseKey || !message || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
