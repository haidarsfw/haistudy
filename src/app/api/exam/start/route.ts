import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import type { PackageTier } from "@/lib/tier";
import { computeQuota, quotaCountFrom } from "@/lib/exam/quota";
import { accountColumns } from "@/lib/auth/account-link";

/**
 * POST /api/exam/start
 *
 * Creates a new exam attempt. Enforces tier-based quotas.
 * Body: { subjectId, examId, examLanguage }
 */
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request.clone());

    const body = await request.json();
    const sk = scopeKey(scope);
    const { subjectId, examId, examLanguage = "id" } = body as {
      subjectId: string;
      examId: string;
      examLanguage?: "en" | "id";
    };

    if (!subjectId || !examId) {
      return NextResponse.json(
        { error: "subjectId and examId are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      // Dev/mock: always allow
      return NextResponse.json({
        attemptId: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        quota: { used: 1, max: 999, remaining: 998 },
      });
    }

    const supabase = createServerClient()!;

    // Get user tier + admin status
    const { data: license } = await supabase
      .from("license_keys")
      .select("package_tier, is_admin, referral_exam_bonus")
      .eq("key", licenseKey)
      .maybeSingle();

    if (!license) {
      return NextResponse.json({ error: "Invalid license" }, { status: 401 });
    }

    const isAdmin = Boolean(license.is_admin);
    const tier = (license.package_tier as PackageTier) ?? "normal";

    // Per-subject bonus credits (top-ups) + reset marker (credit model).
    let bonus = 0;
    let resetAt: string | null = null;
    const { data: override } = await supabase
      .from("exam_quota_overrides")
      .select("bonus, reset_at")
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (override) {
      bonus = (override.bonus as number) ?? 0;
      resetAt = (override.reset_at as string) ?? null;
    }

    // Count non-abandoned attempts since the effective reset point (global epoch
    // or this subject's reset_at, whichever is later). History stays intact.
    const { count, error: countError } = await supabase
      .from("exam_attempts")
      .select("id", { count: "exact", head: true })
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .neq("status", "abandoned")
      .gte("started_at", quotaCountFrom(resetAt));

    if (countError) {
      console.error("Exam quota count error (table may not exist):", countError.message);
    }

    const used = count ?? 0;
    // The referral perk (+2) rides on the licence, on top of any per-subject
    // top-up. It raises the allowance only; the attempt count above is untouched.
    const q = computeQuota({
      isAdmin,
      tier,
      bonus: bonus + ((license?.referral_exam_bonus as number | null | undefined) ?? 0),
      used,
    });

    // An attempt already running for this subject is RESUMED, never replaced.
    //
    // Resuming was already the intended behaviour — the launch screen says so —
    // but it only ever worked from a localStorage draft, so it was per-browser.
    // Open the same exam on a second device, or after clearing site data, and
    // the client asked for a fresh start; this route always inserted one, and
    // the orphan it left behind counts against the quota forever — the count
    // above only excludes 'abandoned'. Two taps, two slots gone, on a tier
    // that has five.
    //
    // Returning the existing row costs nothing: it is already counted. It also
    // makes a duplicate in-progress attempt impossible, which is what let the
    // rows pile up in the first place. An attempt whose time is long past still
    // resumes — the player computes the remaining time from started_at and will
    // submit it — and that is the honest outcome, because the slot was spent.
    const { data: running } = await supabase
      .from("exam_attempts")
      .select("id, started_at")
      .eq("license_key", licenseKey)
      .eq("scope_key", sk)
      .eq("subject_id", subjectId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (running) {
      // Quota is reported as-is, not used+1: this attempt was counted when it
      // was created. The client assigns this straight into its quota display,
      // so leaving it out would blank the counter on every resume.
      return NextResponse.json({
        attemptId: running.id,
        startedAt: running.started_at,
        resumed: true,
        quota: { used, max: q.max, remaining: q.remaining },
      });
    }

    if (q.max !== -1 && used >= q.max) {
      return NextResponse.json(
        {
          error: "Kuota latihan soal habis",
          quota: { used, max: q.max, remaining: 0 },
        },
        { status: 429 }
      );
    }

    // Create new attempt
    const startedAt = new Date().toISOString();
    const { data: attempt, error: insertError } = await supabase
      .from("exam_attempts")
      .insert({
        license_key: licenseKey,
        // Identity migration stage 2: the attempt is also stamped with the
        // account, so a score survives the licence it was earned under.
        ...(await accountColumns(supabase, licenseKey)),
        scope_key: sk,
        subject_id: subjectId,
        exam_id: examId,
        started_at: startedAt,
        exam_language: examLanguage,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError || !attempt) {
      console.error("Failed to create exam attempt:", insertError?.message, insertError?.details, insertError?.hint);
      return NextResponse.json(
        { error: `Gagal memulai ujian: ${insertError?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attemptId: attempt.id,
      startedAt,
      quota: {
        used: used + 1,
        max: q.max,
        remaining: q.max === -1 ? -1 : Math.max(0, q.max - used - 1),
      },
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const msg = error instanceof Error ? error.message : "Unknown";
    console.error("Exam start error:", msg, error);
    return NextResponse.json(
      { error: `Gagal memulai ujian: ${msg}` },
      { status: 500 }
    );
  }
}
