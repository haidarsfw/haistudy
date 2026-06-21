import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { scopeKey } from "@/lib/scope";
import { loadCourses } from "@/data";
import { computeQuota, quotaCountFrom } from "@/lib/exam/quota";
import type { ScopeTuple, ExamPeriod } from "@/types/scope";
import type { PackageTier } from "@/lib/tier";

/**
 * GET /api/admin/exam-summary?key=LICENSEKEY
 *
 * Per-user Latihan Soal summary for the admin user-detail panel: subject name,
 * attempts + best/last score%, and the credit-model quota (base + bonus, used,
 * remaining) so the admin can read it clearly and adjust it (reset / top-up).
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
    return NextResponse.json({ scopeKey: "", subjects: [] });
  }

  const supabase = createServerClient()!;

  // License → scope + tier (drives the credit-model quota per subject).
  const { data: lic } = await supabase
    .from("license_keys")
    .select("semester, exam_period, jurusan, is_admin, package_tier")
    .eq("key", key)
    .maybeSingle();

  const isAdmin = Boolean(lic?.is_admin);
  const tier = (lic?.package_tier as PackageTier) ?? "normal";
  const scope: ScopeTuple = {
    semester: (lic?.semester as number) ?? 2,
    examPeriod: (lic?.exam_period as ExamPeriod) ?? "uas",
    jurusan: (lic?.jurusan as string) ?? "bm",
  };
  const sk = scopeKey(scope);

  // Attempts for this license + scope (newest first; cap for safety).
  const { data: attemptRows } = await supabase
    .from("exam_attempts")
    .select(
      "subject_id, status, score_pct, total_score, max_score, started_at, created_at, auto_submitted"
    )
    .eq("license_key", key)
    .eq("scope_key", sk)
    .order("created_at", { ascending: false })
    .limit(400);

  // Per-subject quota overrides (bonus + reset marker).
  const { data: ovRows } = await supabase
    .from("exam_quota_overrides")
    .select("subject_id, bonus, reset_at")
    .eq("license_key", key)
    .eq("scope_key", sk);
  const ovMap = new Map<string, { bonus: number; reset_at: string | null }>();
  for (const o of (ovRows ?? []) as Record<string, unknown>[]) {
    ovMap.set(o.subject_id as string, {
      bonus: (o.bonus as number) ?? 0,
      reset_at: (o.reset_at as string) ?? null,
    });
  }

  // subjectId → course name (best-effort; falls back to the id).
  let nameMap = new Map<string, string>();
  try {
    const courses = await loadCourses(scope);
    nameMap = new Map(courses.map((c) => [c.id, c.name]));
  } catch {
    /* ignore — show the raw subjectId */
  }

  interface Sub {
    subjectId: string;
    subjectName: string;
    scopeKey: string;
    attempts: number; // non-abandoned, all-time (history)
    best: number | null;
    last: number | null;
    lastAt: string | null;
    used: number; // since the effective reset (credit model)
    bonus: number;
    base: number;
    max: number; // base + bonus, or -1 (unlimited)
    remaining: number;
  }
  const map = new Map<string, Sub>();

  for (const r of (attemptRows ?? []) as Record<string, unknown>[]) {
    if (r.status === "abandoned") continue;
    const sid = (r.subject_id as string) || "?";
    const e =
      map.get(sid) ??
      ({
        subjectId: sid,
        subjectName: nameMap.get(sid) ?? sid,
        scopeKey: sk,
        attempts: 0,
        best: null,
        last: null,
        lastAt: null,
        used: 0,
        bonus: 0,
        base: 0,
        max: 0,
        remaining: 0,
      } as Sub);
    e.attempts += 1;
    const pct = r.score_pct == null ? null : Number(r.score_pct);
    if (pct != null) {
      if (e.best == null || pct > e.best) e.best = pct;
      if (e.last == null) {
        e.last = pct;
        e.lastAt = (r.created_at as string) || null;
      }
    }
    // used = attempts started at/after the effective reset point.
    const ov = ovMap.get(sid);
    const from = quotaCountFrom(ov?.reset_at ?? null);
    const startedAt = (r.started_at as string) || (r.created_at as string) || null;
    if (startedAt && new Date(startedAt).getTime() >= new Date(from).getTime()) {
      e.used += 1;
    }
    map.set(sid, e);
  }

  // Include subjects that have an override but no attempts yet (fresh top-up),
  // so the admin can still see + adjust them.
  for (const [sid, ov] of ovMap) {
    if (!map.has(sid)) {
      map.set(sid, {
        subjectId: sid,
        subjectName: nameMap.get(sid) ?? sid,
        scopeKey: sk,
        attempts: 0,
        best: null,
        last: null,
        lastAt: null,
        used: 0,
        bonus: ov.bonus,
        base: 0,
        max: 0,
        remaining: 0,
      });
    }
  }

  const subjects = Array.from(map.values()).map((e) => {
    const ov = ovMap.get(e.subjectId);
    const q = computeQuota({ isAdmin, tier, bonus: ov?.bonus ?? 0, used: e.used });
    return { ...e, bonus: q.bonus, base: q.base, max: q.max, remaining: q.remaining };
  });

  return NextResponse.json({ scopeKey: sk, subjects });
}
