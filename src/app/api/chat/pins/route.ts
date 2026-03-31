import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { ChatMessage } from "@/types";
import { MAX_PINNED_MESSAGES } from "@/lib/constants";

// ─── Mock store ───
const mockPinnedIds: string[] = [];

// ─── GET /api/chat/pins ───
export async function GET() {
  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ pinnedIds: [...mockPinnedIds] });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("pinned_messages")
      .select("message_id")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const pinnedIds = (data || []).map(
      (row: { message_id: string }) => row.message_id
    );
    return NextResponse.json({ pinnedIds });
  } catch (error) {
    console.error("Chat pins GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/chat/pins - Pin a message (admin only) ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messageId, pinnedBy, isAdmin } = body;

    if (!messageId || !pinnedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      if (mockPinnedIds.includes(messageId)) {
        return NextResponse.json({ error: "Already pinned" }, { status: 400 });
      }
      if (mockPinnedIds.length >= MAX_PINNED_MESSAGES) {
        return NextResponse.json(
          { error: `Maximum ${MAX_PINNED_MESSAGES} pinned messages` },
          { status: 400 }
        );
      }
      mockPinnedIds.unshift(messageId);
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    // Check pin count
    const { count } = await supabase
      .from("pinned_messages")
      .select("*", { count: "exact", head: true });

    if ((count || 0) >= MAX_PINNED_MESSAGES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PINNED_MESSAGES} pinned messages` },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("pinned_messages")
      .insert({ message_id: messageId, pinned_by: pinnedBy });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already pinned" }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat pins POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/chat/pins - Unpin a message (admin only) ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { messageId, isAdmin } = body;

    if (!messageId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    if (!isSupabaseServerConfigured) {
      const idx = mockPinnedIds.indexOf(messageId);
      if (idx !== -1) mockPinnedIds.splice(idx, 1);
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("message_id", messageId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat pins DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
