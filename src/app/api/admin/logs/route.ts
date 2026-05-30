import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";
import type { ActivityLog, ErrorLog } from "@/types";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── Mock stores ───
interface ScopedActivityLog extends ActivityLog {
  semester: number;
  examPeriod: "uts" | "uas";
  jurusan: string;
}
interface ScopedErrorLog extends ErrorLog {
  semester: number;
  examPeriod: "uts" | "uas";
  jurusan: string;
}

const mockActivityLogs: ScopedActivityLog[] = [
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
    semester: 2, examPeriod: "uts", jurusan: "bm",
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
    semester: 2, examPeriod: "uts", jurusan: "bm",
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
    semester: 2, examPeriod: "uts", jurusan: "bm",
  },
];

const mockErrorLogs: ScopedErrorLog[] = [
  {
    id: crypto.randomUUID(),
    message: "Failed to fetch quiz data",
    stack: "Error: Network timeout\n  at fetchQuiz (quiz.ts:45)",
    context: { subjectId: "MGMT6012", userId: "B29-ABC123" },
    userAgent: "Mozilla/5.0 Chrome/120",
    resolved: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    semester: 2, examPeriod: "uts", jurusan: "bm",
  },
];

function mapActivityRow(row: Record<string, unknown>): ScopedActivityLog {
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
    semester: (row.semester as number) ?? 2,
    examPeriod: (row.exam_period as "uts" | "uas") ?? "uts",
    jurusan: (row.jurusan as string) ?? "bm",
  };
}

function mapErrorRow(row: Record<string, unknown>): ScopedErrorLog {
  return {
    id: row.id as string,
    message: row.message as string,
    stack: (row.stack as string) || null,
    context: (row.context as Record<string, unknown>) || null,
    userAgent: (row.user_agent as string) || null,
    resolved: row.resolved as boolean,
    createdAt: row.created_at as string,
    semester: (row.semester as number) ?? 2,
    examPeriod: (row.exam_period as "uts" | "uas") ?? "uts",
    jurusan: (row.jurusan as string) ?? "bm",
  };
}

// ─── GET /api/admin/logs?type=activity|error&limit=50&scope=...|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "activity";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    if (!isSupabaseServerConfigured) {
      const inScope = <T extends { semester: number; examPeriod: "uts" | "uas"; jurusan: string }>(
        rows: T[]
      ) => {
        if (resolved.mode === "all") return rows;
        return rows.filter(
          (r) =>
            r.semester === resolved.scope.semester &&
            r.examPeriod === resolved.scope.examPeriod &&
            r.jurusan === resolved.scope.jurusan
        );
      };
      if (type === "error") {
        return NextResponse.json({ logs: inScope(mockErrorLogs).slice(0, limit) });
      }
      return NextResponse.json({ logs: inScope(mockActivityLogs).slice(0, limit) });
    }

    const supabase = createServerClient()!;

    if (type === "error") {
      let q = supabase
        .from("error_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (resolved.mode === "scoped") {
        q = q
          .eq("semester", resolved.scope.semester)
          .eq("exam_period", resolved.scope.examPeriod)
          .eq("jurusan", resolved.scope.jurusan);
      }
      const { data, error } = await q;
      if (error) throw error;
      return NextResponse.json({
        logs: (data || []).map(mapErrorRow),
      });
    }

    let q = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({
      logs: (data || []).map(mapActivityRow),
    });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin logs GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/logs - Mark error as resolved ───
export async function PATCH(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    const body = await request.json();
    const { id, resolved: isResolved } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!isSupabaseServerConfigured) {
      const log = mockErrorLogs.find((l) => l.id === id);
      if (log) {
        if (
          resolved.mode === "scoped" &&
          (log.semester !== resolved.scope.semester ||
            log.examPeriod !== resolved.scope.examPeriod ||
            log.jurusan !== resolved.scope.jurusan)
        ) {
          return NextResponse.json({ error: "Log tidak ada di scope ini" }, { status: 404 });
        }
        log.resolved = isResolved ?? true;
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    let q = supabase
      .from("error_logs")
      .update({ resolved: isResolved ?? true })
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
    console.error("Admin logs PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/logs - Clear logs by type ───
// "All periods" allowed here - bulk cross-scope log clear is intentional.
export async function DELETE(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    const body = await request.json();
    const { type } = body;

    if (!type || !["activity", "error"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'activity' or 'error'" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      if (resolved.mode === "all") {
        if (type === "error") mockErrorLogs.length = 0;
        else mockActivityLogs.length = 0;
      } else {
        const filterMatch = (l: { semester: number; examPeriod: "uts" | "uas"; jurusan: string }) =>
          l.semester === resolved.scope.semester &&
          l.examPeriod === resolved.scope.examPeriod &&
          l.jurusan === resolved.scope.jurusan;
        if (type === "error") {
          const kept = mockErrorLogs.filter((l) => !filterMatch(l));
          mockErrorLogs.length = 0;
          mockErrorLogs.push(...kept);
        } else {
          const kept = mockActivityLogs.filter((l) => !filterMatch(l));
          mockActivityLogs.length = 0;
          mockActivityLogs.push(...kept);
        }
      }
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    const table = type === "error" ? "error_logs" : "activity_logs";
    let q = supabase.from(table).delete().neq("id", "");
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
    console.error("Admin logs DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
