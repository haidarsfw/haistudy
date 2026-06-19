import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";

const GRACE_PERIOD_MS = 30_000; // 30 seconds

/**
 * POST /api/exam/abandon
 *
 * Abandon an exam attempt within the 30-second grace period.
 * Sets status to 'abandoned' so the attempt doesn't count toward quota.
 *
 * Body: { attemptId }
 */
export async function POST(request: Request) {
  try {
    await requireScope(request.clone());

    const body = await request.json();
    const { attemptId } = body as { attemptId: string };

    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey = cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ ok: true, abandoned: true });
    }

    const supabase = createServerClient()!;

    // Fetch the attempt
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("id, license_key, started_at, status")
      .eq("id", attemptId)
      .eq("license_key", licenseKey)
      .maybeSingle();

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found" },
        { status: 404 }
      );
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        { error: "Attempt already completed" },
        { status: 400 }
      );
    }

    // Check grace period
    const startedAt = new Date(attempt.started_at).getTime();
    const elapsed = Date.now() - startedAt;

    if (elapsed > GRACE_PERIOD_MS) {
      return NextResponse.json(
        {
          error: "Grace period expired. Exit will use your attempt quota.",
          gracePeriodExpired: true,
        },
        { status: 400 }
      );
    }

    // Abandon the attempt (doesn't count toward quota)
    await supabase
      .from("exam_attempts")
      .update({ status: "abandoned" })
      .eq("id", attemptId);

    return NextResponse.json({ ok: true, abandoned: true });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Exam abandon error:", error);
    return NextResponse.json(
      { error: "Gagal membatalkan ujian" },
      { status: 500 }
    );
  }
}
