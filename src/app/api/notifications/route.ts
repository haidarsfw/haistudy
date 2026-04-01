import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { Notification } from "@/types";

// ─── Mock store ───
const mockNotifications = new Map<string, Notification[]>();

function getMockNotifications(licenseKey: string): Notification[] {
  return mockNotifications.get(licenseKey) || [];
}

function mapRowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: row.type as Notification["type"],
    senderName: (row.sender_name as string) || null,
    preview: (row.preview as string) || null,
    context: row.context as Notification["context"],
    threadId: (row.thread_id as string) || null,
    subjectId: (row.subject_id as string) || null,
    threadTitle: (row.thread_title as string) || null,
    messageId: (row.message_id as string) || null,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/notifications?licenseKey=xxx ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const notifs = getMockNotifications(licenseKey).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return NextResponse.json({ notifications: notifs.slice(0, 50) });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("license_key", licenseKey)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    const notifications = (data || []).map(mapRowToNotification);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/notifications - Create notification(s) ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { notifications } = body as {
      notifications: Array<{
        licenseKey: string;
        type: Notification["type"];
        senderName: string;
        preview: string;
        context: Notification["context"];
        threadId?: string;
        subjectId?: string;
        threadTitle?: string;
        messageId?: string;
      }>;
    };

    if (!notifications?.length) {
      return NextResponse.json(
        { error: "notifications array is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      for (const n of notifications) {
        const notif: Notification = {
          id: crypto.randomUUID(),
          type: n.type,
          senderName: n.senderName || null,
          preview: n.preview || null,
          context: n.context,
          threadId: n.threadId || null,
          subjectId: n.subjectId || null,
          threadTitle: n.threadTitle || null,
          messageId: n.messageId || null,
          read: false,
          createdAt: new Date().toISOString(),
        };
        const existing = getMockNotifications(n.licenseKey);
        mockNotifications.set(n.licenseKey, [notif, ...existing]);
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const rows = notifications.map((n) => ({
      license_key: n.licenseKey,
      type: n.type,
      sender_name: n.senderName || null,
      preview: n.preview || null,
      context: n.context,
      thread_id: n.threadId || null,
      subject_id: n.subjectId || null,
      thread_title: n.threadTitle || null,
      message_id: n.messageId || null,
    }));

    const { error } = await supabase.from("notifications").insert(rows);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/notifications - Mark as read ───
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notificationIds, licenseKey, markAll } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      const notifs = getMockNotifications(licenseKey);
      if (markAll) {
        notifs.forEach((n) => (n.read = true));
      } else if (notificationIds?.length) {
        const idSet = new Set(notificationIds);
        notifs.forEach((n) => {
          if (idSet.has(n.id)) n.read = true;
        });
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;

    if (markAll) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("license_key", licenseKey)
        .eq("read", false);
      if (error) throw error;
    } else if (notificationIds?.length) {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", notificationIds);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/notifications - Clear announcement notifications ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { action, notificationId, licenseKey } = body;

    if (action === "clearAnnouncements") {
      // Admin action: clear ALL announcement notifications for ALL users
      if (!isSupabaseServerConfigured) {
        // Mock: remove announcement-type notifications from all users
        for (const [key, notifs] of mockNotifications.entries()) {
          mockNotifications.set(
            key,
            notifs.filter((n) => n.type !== "announcement")
          );
        }
        return NextResponse.json({ success: true });
      }

      const supabase = createServerClient()!;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("type", "announcement");
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Single notification dismiss
    if (notificationId && licenseKey) {
      if (!isSupabaseServerConfigured) {
        const notifs = getMockNotifications(licenseKey);
        mockNotifications.set(
          licenseKey,
          notifs.filter((n) => n.id !== notificationId)
        );
        return NextResponse.json({ success: true });
      }

      const supabase = createServerClient()!;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
