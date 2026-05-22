import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope, requireScopedMode } from "@/lib/auth/admin-scope";
import { scopeColumns, ScopeError } from "@/lib/auth/scope-check";
import type { Announcement } from "@/types";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

interface ScopedAnnouncement extends Announcement {
  semester: number;
  examPeriod: "uts" | "uas";
  jurusan: string;
}

// ─── Mock store ───
const mockAnnouncements = new Map<string, ScopedAnnouncement>();

// Seed
if (mockAnnouncements.size === 0) {
  const id1 = crypto.randomUUID();
  mockAnnouncements.set(id1, {
    id: id1,
    message: "Selamat datang di haistudy! Platform ini masih dalam tahap pengembangan.",
    type: "info",
    active: true,
    createdAt: new Date().toISOString(),
    semester: 2, examPeriod: "uts", jurusan: "bm",
  });
}

function mapRow(row: Record<string, unknown>): ScopedAnnouncement {
  return {
    id: row.id as string,
    message: row.message as string,
    type: row.type as "info" | "warning" | "maintenance",
    active: row.active as boolean,
    createdAt: row.created_at as string,
    semester: (row.semester as number) ?? 2,
    examPeriod: (row.exam_period as "uts" | "uas") ?? "uts",
    jurusan: (row.jurusan as string) ?? "bm",
  };
}

// ─── GET /api/admin/announcements?scope=...|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);

    if (!isSupabaseServerConfigured) {
      let rows = Array.from(mockAnnouncements.values());
      if (resolved.mode === "scoped") {
        rows = rows.filter(
          (r) =>
            r.semester === resolved.scope.semester &&
            r.examPeriod === resolved.scope.examPeriod &&
            r.jurusan === resolved.scope.jurusan
        );
      }
      return NextResponse.json({ announcements: rows });
    }

    const supabase = createServerClient()!;
    let q = supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data, error } = await q;

    if (error) throw error;
    return NextResponse.json({
      announcements: (data || []).map(mapRow),
    });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Announcements GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/admin/announcements ───
export async function POST(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    requireScopedMode(resolved);

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
      const announcement: ScopedAnnouncement = {
        id: crypto.randomUUID(),
        message: message.trim(),
        type: type || "info",
        active: true,
        createdAt: new Date().toISOString(),
        semester: resolved.scope.semester,
        examPeriod: resolved.scope.examPeriod,
        jurusan: resolved.scope.jurusan,
      };
      mockAnnouncements.set(announcement.id, announcement);
      return NextResponse.json({ announcement });
    }

    const supabase = createServerClient()!;

    let announcement: ScopedAnnouncement | null = null;

    if (!notifyOnly) {
      const { data, error } = await supabase
        .from("announcements")
        .insert({
          message: message.trim(),
          type: type || "info",
          active: true,
          ...scopeColumns(resolved.scope),
        })
        .select()
        .single();

      if (error) throw error;
      announcement = mapRow(data);
    }

    // Fan-out notification to active license keys IN THE TARGET SCOPE ONLY.
    try {
      const { data: licenseKeys } = await supabase
        .from("license_keys")
        .select("key")
        .is("suspended_until", null)
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);

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
          ...scopeColumns(resolved.scope),
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
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Announcements POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PUT /api/admin/announcements - Toggle active or update message ───
export async function PUT(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
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
      if (
        resolved.mode === "scoped" &&
        (ann.semester !== resolved.scope.semester ||
          ann.examPeriod !== resolved.scope.examPeriod ||
          ann.jurusan !== resolved.scope.jurusan)
      ) {
        return NextResponse.json({ error: "Announcement tidak ada di scope ini" }, { status: 404 });
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

    let q = supabase
      .from("announcements")
      .update(updates)
      .eq("id", id);
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data, error } = await q.select().single();

    if (error) throw error;
    return NextResponse.json({ announcement: mapRow(data) });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Announcements PUT error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/announcements ───
export async function DELETE(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const ann = mockAnnouncements.get(id);
      if (ann && resolved.mode === "scoped") {
        if (
          ann.semester !== resolved.scope.semester ||
          ann.examPeriod !== resolved.scope.examPeriod ||
          ann.jurusan !== resolved.scope.jurusan
        ) {
          return NextResponse.json({ error: "Announcement tidak ada di scope ini" }, { status: 404 });
        }
      }
      mockAnnouncements.delete(id);
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    let q = supabase
      .from("announcements")
      .delete()
      .eq("id", id);
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { error } = await q;

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Announcements DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
