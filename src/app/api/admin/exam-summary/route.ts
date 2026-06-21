import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

/**
 * GET /api/admin/exam-summary?key=LICENSEKEY
 *
 * Lightweight per-user Latihan Soal summary for the admin user-detail panel:
 * attempts + best/last score% per subject. Counts only; no answer dumps.
 */
export async function GET(request: Request) {
  const { authorized } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const key = (searchParams.get("key") || "").trim().toUpperCase();
  if (!key) {
    return NextResponse.json({ error: "key required" }, { status: 400 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ subjects: [] });
  }

  const supabase = createServerClient()!;
  const { data } = await supabase
    .from("exam_attempts")
    .select("subject_id, status, score_pct, total_score, max_score, created_at, auto_submitted")
    .eq("license_key", key)
    .order("created_at", { ascending: false })
    .limit(200);

  interface Sub {
    subjectId: string;
    attempts: number; // non-abandoned
    best: number | null; // best score_pct
    last: number | null; // most recent score_pct
    lastAt: string | null;
  }
  const map = new Map<string, Sub>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    if (r.status === "abandoned") continue;
    const sid = (r.subject_id as string) || "?";
    const e = map.get(sid) ?? { subjectId: sid, attempts: 0, best: null, last: null, lastAt: null };
    e.attempts += 1;
    const pct = r.score_pct == null ? null : Number(r.score_pct);
    if (pct != null) {
      if (e.best == null || pct > e.best) e.best = pct;
      if (e.last == null) {
        // rows are newest-first → first scored row per subject is the latest
        e.last = pct;
        e.lastAt = (r.created_at as string) || null;
      }
    }
    map.set(sid, e);
  }

  return NextResponse.json({ subjects: Array.from(map.values()) });
}
