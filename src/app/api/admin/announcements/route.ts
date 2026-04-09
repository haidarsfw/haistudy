import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Announcement } from "@/types";

// ─── Mock store ───
const mockAnnouncements = new Map<string, Announcement>();

// Seed
if (mockAnnouncements.size === 0) {
  const id1 = crypto.randomUUID();
  mockAnnouncements.set(id1, {
    id: id1,
    message: "Selamat datang di haistudy! Platform ini masih dalam tahap pengembangan.",
    type: "info",
    active: true,
    createdAt: new Date().toISOString(),
  });
}

function mapRow(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    message: row.message as string,
    type: row.type as "info" | "warning" | "maintenance",
    active: row.active as boolean,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/admin/announcements ───
export async function GET() {
  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        announcements: Array.from(mockAnnouncements.values()),
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({
      announcements: (data || []).map(mapRow),
    });
  } catch (error) {
    console.error("Announcements GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/announcements ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, type, notifyOnly } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      if (notifyOnly) {
        return NextResponse.json({ success: true, notifyOnly: true });
      }
      const announcement: Announcement = {
        id: crypto.randomUUID(),
        message: message.trim(),
        type: type || "info",
        active: true,
        createdAt: new Date().toISOString(),
      };
      mockAnnouncements.set(announcement.id, announcement);
      return NextResponse.json({ announcement });
    }

    const supabase = createServerClient()!;

    let announcement: Announcement | null = null;

    // Only create banner announcement if not notifyOnly
    if (!notifyOnly) {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          message: message.trim(),
          type: type || "info",
          active: true,
        })
        .select()
        .single();

      if (error) throw error;
      announcement = mapRow(data);
    }

    // Notify all active license key holders
    try {
      const { data: licenseKeys } = await supabase
        .from("license_keys")
        .select("key")
        .is("suspended_until", null);

      if (licenseKeys && licenseKeys.length > 0) {
        const notificationRows = licenseKeys.map((lk) => ({
          license_key: lk.key,
          type: "announcement" as const,
          sender_name: null,
          preview: message.trim(),
          context: "system" as const,
          thread_id: null,
          subject_id: null,
          thread_title: null,
        }));

        await supabase.from("notifications").insert(notificationRows);
      }
    } catch (notifError) {
      console.error("Failed to create announcement notifications:", notifError);
    }

    if (notifyOnly) {
      return NextResponse.json({ success: true, notifyOnly: true });
    }
    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("Announcements POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/admin/announcements - Toggle active or update message ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, message, type, active } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const ann = mockAnnouncements.get(id);
      if (!ann) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (message !== undefined) ann.message = message;
      if (type !== undefined) ann.type = type;
      if (active !== undefined) ann.active = active;
      return NextResponse.json({ announcement: ann });
    }

    const supabase = createServerClient()!;
    const updates: Record<string, unknown> = {};
    if (message !== undefined) updates.message = message;
    if (type !== undefined) updates.type = type;
    if (active !== undefined) updates.active = active;

    const { data, error } = await supabase
      .from("announcements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ announcement: mapRow(data) });
  } catch (error) {
    console.error("Announcements PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/announcements ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      mockAnnouncements.delete(id);
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcements DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
