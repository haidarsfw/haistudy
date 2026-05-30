import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, scopeEq, ScopeError } from "@/lib/auth/scope-check";
import { resolveSessionTier } from "@/lib/auth/session-tier";
import { canUseVip } from "@/lib/tier";

// ─── DELETE /api/snippets/[id] ─── remove a snippet the caller owns, in scope.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const scope = await requireScope(request);
    const { isAdmin, tier, licenseKey } = await resolveSessionTier();
    if (!canUseVip(isAdmin, tier)) {
      return NextResponse.json({ error: "vip_only" }, { status: 403 });
    }
    if (!licenseKey) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ success: true });
    }

    const supabase = createServerClient()!;
    // Scope + owner guard: only the caller's own row in their scope is deletable.
    const { error } = await scopeEq(scope)(
      supabase
        .from("snippet_library")
        .delete()
        .eq("id", id)
        .eq("license_key", licenseKey)
    );
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Snippets DELETE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
