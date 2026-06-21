import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

/**
 * POST /api/admin/exam-quota
 *
 * Admin adjust of a user's per-subject exam quota (credit model). Body:
 *   { key, scopeKey, subjectId, action: "reset" | "setBonus" | "addBonus", value? }
 *   - reset     → set reset_at = now() (fresh count; history kept).
 *   - setBonus  → set bonus = value (0..999).
 *   - addBonus  → bonus += value (clamped 0..999; value may be negative).
 * Writes via service_role (RLS-locked table). Admin-only.
 */
export async function POST(request: Request) {
  const { authorized, licenseKey: adminKey } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const key = String(body.key || "").trim().toUpperCase();
  const scopeKeyVal = String(body.scopeKey || "").trim();
  const subjectId = String(body.subjectId || "").trim();
  const action = String(body.action || "");

  if (!key || !scopeKeyVal || !subjectId) {
    return NextResponse.json(
      { error: "key, scopeKey, subjectId required" },
      { status: 400 }
    );
  }
  if (!["reset", "setBonus", "addBonus"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ ok: true, bonus: 0, reset_at: null });
  }

  const supabase = createServerClient()!;
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("exam_quota_overrides")
    .select("bonus, reset_at")
    .eq("license_key", key)
    .eq("scope_key", scopeKeyVal)
    .eq("subject_id", subjectId)
    .maybeSingle();

  let bonus = (existing?.bonus as number) ?? 0;
  let resetAt = (existing?.reset_at as string) ?? null;

  const clamp = (n: number) => Math.max(0, Math.min(999, n | 0));
  if (action === "reset") {
    resetAt = now;
  } else if (action === "setBonus") {
    bonus = clamp(Number(body.value));
  } else if (action === "addBonus") {
    bonus = clamp(bonus + (Number(body.value) || 0));
  }

  const { error } = await supabase.from("exam_quota_overrides").upsert(
    {
      license_key: key,
      scope_key: scopeKeyVal,
      subject_id: subjectId,
      bonus,
      reset_at: resetAt,
      updated_at: now,
      updated_by: adminKey,
    },
    { onConflict: "license_key,scope_key,subject_id" }
  );
  if (error) {
    console.error("Admin exam-quota upsert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bonus, reset_at: resetAt });
}
