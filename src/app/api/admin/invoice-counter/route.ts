import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope, requireScopedMode } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";

// ─── POST /api/admin/invoice-counter?scope=... — reset per-scope invoice # ───
// Zeroes scope_invoice_counter for the resolved scope so the NEXT purchase
// restarts at #001. Per-scope only (refuses "All periods"). Order rows are left
// untouched — only the numbering sequence resets. (The separate, unrelated
// global invoice_counter behind /api/admin/invoice is not affected.)
export async function POST(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    requireScopedMode(resolved); // per-scope only; refuse "all"

    if (!isSupabaseServerConfigured) return NextResponse.json({ success: true });

    const supabase = createServerClient()!;
    const { error } = await supabase.from("scope_invoice_counter").upsert(
      {
        semester: resolved.scope.semester,
        exam_period: resolved.scope.examPeriod,
        jurusan: resolved.scope.jurusan,
        value: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "semester,exam_period,jurusan" }
    );
    if (error) return NextResponse.json({ error: "Server error" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Invoice-counter POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
