import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// ─── GET /api/admin/ai-conversations?licenseKey=xxx&scope=...|allPeriods=1 ───
export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);

    const { searchParams } = new URL(request.url);
    const licenseKey = searchParams.get("licenseKey");

    if (!licenseKey) {
      return NextResponse.json(
        { error: "licenseKey is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ conversations: [] });
    }

    const supabase = createServerClient()!;
    let q = supabase
      .from("ai_conversations")
      .select("id, license_key, title, messages, created_at, updated_at, semester, exam_period, jurusan")
      .eq("license_key", licenseKey)
      .order("updated_at", { ascending: false });

    if (resolved.mode === "scoped") {
      q = q
        .eq("semester", resolved.scope.semester)
        .eq("exam_period", resolved.scope.examPeriod)
        .eq("jurusan", resolved.scope.jurusan);
    }

    const { data, error } = await q;

    if (error) {
      console.error("Admin AI conversations fetch error:", error);
      return NextResponse.json({ conversations: [] });
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin AI conversations error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
