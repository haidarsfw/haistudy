import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";

/**
 * GET /api/analytics/summary
 *
 * The caller's own study analytics, in ONE round trip. Read-only, scoped to
 * the caller's license key — no admin gate, no poll, no writes. Returns
 * practice-exam (Latihan Soal) attempt summaries (NO answers/grading jsonb)
 * plus two scalar license_keys columns for the time card. Everything else on
 * the analytics page comes from localStorage / already-loaded providers, so
 * this is the page's single network call. Free-tier safe by construction.
 */

interface AttemptRow {
  id: string;
  subject_id: string;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  duration_used_seconds: number | null;
  auto_submitted: boolean | null;
  exam_language: string | null;
  created_at: string;
}

export async function GET(request: Request) {
  try {
    const scope = await requireScope(request);
    const sk = scopeKey(scope);

    const cookieStore = await cookies();
    const licenseKey =
      cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({
        attempts: [],
        totalOnlineMinutes: 0,
        memberSince: null,
      });
    }

    const supabase = createServerClient()!;

    // Summary columns only (no answers/grading_results jsonb) — caller + scope.
    const [attemptsRes, licenseRes] = await Promise.all([
      supabase
        .from("exam_attempts")
        .select(
          "id, subject_id, total_score, max_score, score_pct, status, started_at, submitted_at, duration_used_seconds, auto_submitted, exam_language, created_at"
        )
        .eq("license_key", licenseKey)
        .eq("scope_key", sk)
        .neq("status", "abandoned")
        .order("created_at", { ascending: false }),
      supabase
        .from("license_keys")
        .select("total_online_minutes, created_at")
        .eq("key", licenseKey)
        .maybeSingle(),
    ]);

    const attempts = (attemptsRes.data ?? []) as AttemptRow[];
    const license = licenseRes.data as
      | { total_online_minutes: number | null; created_at: string | null }
      | null;

    return NextResponse.json({
      attempts,
      totalOnlineMinutes: license?.total_online_minutes ?? 0,
      memberSince: license?.created_at ?? null,
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Analytics summary error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
