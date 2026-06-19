import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import type { PackageTier } from "@/lib/tier";

// ─── Tier-based attempt limits ───
function maxAttempts(
  isAdmin: boolean,
  tier: PackageTier | null | undefined
): number {
  if (isAdmin) return -1; // -1 = unlimited (shown as ∞ on frontend)
  switch (tier) {
    case "diamond":
      return 5;
    case "vip":
      return 3;
    default:
      return 2; // share, normal
  }
}

/**
 * GET /api/exam/quota?subjectId=bizethics
 *
 * Returns quota info + past attempt summaries for a subject.
 */
export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const sk = scopeKey(scope);

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    if (!subjectId) {
      return NextResponse.json(
        { error: "subjectId is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      // Dev/mock: return unlimited quota
      return NextResponse.json({
        quota: { subjectId, used: 0, max: -1, remaining: -1 },
        history: [],
      });
    }

    const supabase = createServerClient()!;

    // Get user tier + admin status
    const { data: license } = await supabase
      .from("license_keys")
      .select("package_tier, is_admin")
      .eq("key", licenseKey)
      .maybeSingle();

    const isAdmin = Boolean(license?.is_admin);
    const tier = (license?.package_tier as PackageTier) ?? "normal";
    const max = maxAttempts(isAdmin, tier);

    // Count non-abandoned attempts
    const { count } = await supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .neq("status", "abandoned");

    const used = count ?? 0;

    // Fetch attempt summaries for history
    const { data: history } = await supabase
      .from("exam_attempts")
      .select(
        "id, total_score, max_score, score_pct, started_at, submitted_at, duration_used_seconds, auto_submitted, status, exam_language"
      )
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .neq("status", "abandoned")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      quota: {
        subjectId,
        used,
        max,
        remaining: max === -1 ? -1 : Math.max(0, max - used),
      },
      history: history ?? [],
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Exam quota error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quota" },
      { status: 500 }
    );
  }
}
