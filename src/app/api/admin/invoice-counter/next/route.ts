import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope, requireScopedMode } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";

// ─── POST /api/admin/invoice-counter/next?scope=... ───
// Atomically assign the next invoice number for the resolved scope. Shares the
// exact same sequence (scope_invoice_counter / next_scope_invoice RPC) that real
// purchases use, so admin-generated and self-checkout invoices never collide and
// the number always matches the scope's real invoice sequence.
export async function POST(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const resolved = await resolveAdminScope(request);
    requireScopedMode(resolved); // per-scope only; refuse "all"

    if (!isSupabaseServerConfigured) return NextResponse.json({ value: 1 });

    const supabase = createServerClient()!;
    const { data, error } = await supabase.rpc("next_scope_invoice", {
      p_sem: resolved.scope.semester,
      p_exam: resolved.scope.examPeriod,
      p_jur: resolved.scope.jurusan,
    });
    if (error) return NextResponse.json({ error: "Server error" }, { status: 500 });
    return NextResponse.json({ value: (data as number) ?? 1 });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Invoice-counter next error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
