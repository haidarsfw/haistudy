import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { resolveAdminScope } from "@/lib/auth/admin-scope";
import { ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import type { AdminAttemptSummary } from "@/types/exam";

/**
 * GET /api/admin/exam-attempts
 *   List branch  (no `id`): graded practice-exam attempts ranked by score_pct
 *                desc, SUMMARY columns only (no answers/grading jsonb). Scope
 *                filtered unless admin is in "All periods" mode.
 *   Detail branch (`?id=<uuid>`): one attempt, FULL (answers + grading_results
 *                parsed). Fetched only when an admin clicks a row.
 *
 * Admin-only (validateAdmin). Read-only: no writes, no realtime, no poll.
 * Service_role bypasses RLS, so validateAdmin is the only guard.
 */

function scopeErrorResponse(error: unknown) {
  if (error instanceof ScopeError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof Response) return error;
  return null;
}

// Summary columns for the leaderboard list. Deliberately excludes the heavy
// `answers` + `grading_results` jsonb (fetched only in the detail branch).
const LIST_COLUMNS =
  "id, license_key, scope_key, subject_id, exam_id, total_score, max_score, " +
  "score_pct, started_at, submitted_at, duration_used_seconds, auto_submitted, " +
  "exam_language, status, created_at, " +
  "license_keys!inner(name, short_name, semester, exam_period, jurusan)";

// Supabase relational selects don't infer cleanly on this untyped client
// (they widen to GenericStringError), so we cast query results to these.
interface EmbeddedLicense {
  name: string | null;
  short_name: string | null;
  semester: number | null;
  exam_period: string | null;
  jurusan: string | null;
}
interface RawListRow {
  id: string;
  license_key: string;
  scope_key: string;
  subject_id: string;
  exam_id: string;
  total_score: number | null;
  max_score: number | null;
  score_pct: number | null;
  started_at: string | null;
  submitted_at: string | null;
  duration_used_seconds: number | null;
  auto_submitted: boolean | null;
  exam_language: string | null;
  status: string;
  created_at: string;
  license_keys: EmbeddedLicense | null;
}
interface RawDetailRow extends RawListRow {
  answers: unknown;
  grading_results: unknown;
}

// Resolve a human display name: activation user_name (what the other
// leaderboards show) → license_keys.name → short_name → the key itself.
function resolveName(
  licenseKey: string,
  lk: EmbeddedLicense | null,
  activationNames: Map<string, string>
): string {
  return (
    activationNames.get(licenseKey) ||
    lk?.name ||
    lk?.short_name ||
    licenseKey
  );
}

export async function GET(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resolved = await resolveAdminScope(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!isSupabaseServerConfigured) {
      return NextResponse.json(id ? { attempt: null } : { attempts: [] });
    }

    const supabase = createServerClient()!;

    // ─── Detail branch: one attempt, full payload ───
    if (id) {
      const { data: attempt, error } = await supabase
        .from("exam_attempts")
        .select(
          "*, license_keys!inner(name, short_name, semester, exam_period, jurusan)"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!attempt) {
        return NextResponse.json(
          { error: "Attempt not found" },
          { status: 404 }
        );
      }

      const att = attempt as unknown as RawDetailRow;

      // Human name from the activation row (license_keys has no user_name).
      const { data: act } = await supabase
        .from("activations")
        .select("user_name")
        .eq("license_key", att.license_key)
        .limit(1)
        .maybeSingle();

      const actName = (act as { user_name?: string } | null)?.user_name;
      const parsed = {
        ...att,
        userName: resolveName(
          att.license_key,
          att.license_keys,
          new Map(actName ? [[att.license_key, actName]] : [])
        ),
        answers:
          typeof att.answers === "string"
            ? JSON.parse(att.answers)
            : att.answers,
        grading_results:
          typeof att.grading_results === "string"
            ? JSON.parse(att.grading_results)
            : att.grading_results,
      };

      return NextResponse.json({ attempt: parsed });
    }

    // ─── List branch: graded attempts ranked by score ───
    let q = supabase
      .from("exam_attempts")
      .select(LIST_COLUMNS)
      .eq("status", "graded")
      .not("score_pct", "is", null)
      .order("score_pct", { ascending: false, nullsFirst: false })
      .order("submitted_at", { ascending: false })
      .limit(500);

    if (resolved.mode === "scoped") {
      q = q.eq("scope_key", scopeKey(resolved.scope));
    }

    const { data, error } = await q;
    if (error) throw error;

    const rows = (data ?? []) as unknown as RawListRow[];

    // One small query for activation display names (≤ a few dozen keys).
    const keys = Array.from(new Set(rows.map((r) => r.license_key)));
    const activationNames = new Map<string, string>();
    if (keys.length > 0) {
      const { data: acts } = await supabase
        .from("activations")
        .select("license_key, user_name")
        .in("license_key", keys);
      for (const a of (acts ?? []) as { license_key: string; user_name: string | null }[]) {
        if (!activationNames.has(a.license_key) && a.user_name) {
          activationNames.set(a.license_key, a.user_name);
        }
      }
    }

    const attempts: AdminAttemptSummary[] = rows.map((row) => ({
      id: row.id,
      licenseKey: row.license_key,
      scopeKey: row.scope_key,
      subjectId: row.subject_id,
      examId: row.exam_id,
      userName: resolveName(row.license_key, row.license_keys, activationNames),
      totalScore: row.total_score ?? null,
      maxScore: row.max_score ?? null,
      scorePct: row.score_pct ?? null,
      startedAt: row.started_at ?? null,
      submittedAt: row.submitted_at ?? null,
      durationUsedSeconds: row.duration_used_seconds ?? null,
      autoSubmitted: Boolean(row.auto_submitted),
      examLanguage: row.exam_language ?? "id",
      status: row.status,
      createdAt: row.created_at,
      semester: row.license_keys?.semester ?? null,
      examPeriod: row.license_keys?.exam_period ?? null,
      jurusan: row.license_keys?.jurusan ?? null,
    }));

    return NextResponse.json({ attempts });
  } catch (error) {
    const r = scopeErrorResponse(error);
    if (r) return r;
    console.error("Admin exam-attempts GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
