import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import type { ActivityLog, ErrorLog } from "@/types";

// ─── Mock stores ───
const mockActivityLogs: ActivityLog[] = [
  {
    id: crypto.randomUUID(),
    userName: "Budi Santoso",
    action: "login",
    details: "Desktop login",
    count: 1,
    ipAddress: "103.28.12.45",
    deviceType: "desktop",
    deviceLabel: "Windows",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    userName: "Siti Rahayu",
    action: "quiz_complete",
    details: "MGMT6012 - Score: 85/100",
    count: 1,
    ipAddress: "182.1.77.200",
    deviceType: "mobile",
    deviceLabel: "iPhone",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: crypto.randomUUID(),
    userName: null,
    action: "system",
    details: "Server started",
    count: 1,
    ipAddress: null,
    deviceType: null,
    deviceLabel: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const mockErrorLogs: ErrorLog[] = [
  {
    id: crypto.randomUUID(),
    message: "Failed to fetch quiz data",
    stack: "Error: Network timeout\n  at fetchQuiz (quiz.ts:45)",
    context: { subjectId: "MGMT6012", userId: "B29-ABC123" },
    userAgent: "Mozilla/5.0 Chrome/120",
    resolved: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

function mapActivityRow(row: Record<string, unknown>): ActivityLog {
  return {
    id: row.id as string,
    userName: (row.user_name as string) || null,
    action: row.action as string,
    details: (row.details as string) || null,
    count: (row.count as number) || 1,
    ipAddress: (row.ip_address as string) || null,
    deviceType: (row.device_type as string) || null,
    deviceLabel: (row.device_label as string) || null,
    createdAt: row.created_at as string,
  };
}

function mapErrorRow(row: Record<string, unknown>): ErrorLog {
  return {
    id: row.id as string,
    message: row.message as string,
    stack: (row.stack as string) || null,
    context: (row.context as Record<string, unknown>) || null,
    userAgent: (row.user_agent as string) || null,
    resolved: row.resolved as boolean,
    createdAt: row.created_at as string,
  };
}

// ─── GET /api/admin/logs?type=activity|error&limit=50 ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "activity";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    if (!isSupabaseServerConfigured) {
      if (type === "error") {
        return NextResponse.json({ logs: mockErrorLogs.slice(0, limit) });
      }
      return NextResponse.json({ logs: mockActivityLogs.slice(0, limit) });
    }

    const supabase = createServerClient()!;

    if (type === "error") {
      const { data, error } = await supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return NextResponse.json({
        logs: (data || []).map(mapErrorRow),
      });
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({
      logs: (data || []).map(mapActivityRow),
    });
  } catch (error) {
    console.error("Admin logs GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/logs - Mark error as resolved ───
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, resolved } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const log = mockErrorLogs.find((l) => l.id === id);
      if (log) log.resolved = resolved ?? true;
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("error_logs")
      .update({ resolved: resolved ?? true })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin logs PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/logs - Clear logs by type ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !["activity", "error"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'activity' or 'error'" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      if (type === "error") {
        mockErrorLogs.length = 0;
      } else {
        mockActivityLogs.length = 0;
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const table = type === "error" ? "error_logs" : "activity_logs";
    const { error } = await supabase.from(table).delete().neq("id", "");

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin logs DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
