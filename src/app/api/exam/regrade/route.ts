import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { recordActivity } from "@/lib/admin/activity";
import { checkCooldown } from "@/lib/auth/cooldown";
import { loadExamData } from "@/data";
import type { ExamData } from "@/types/exam";
import {
  gradeChunked,
  finalizeResults,
  isGradingConfigured,
  type AnswerInput,
} from "@/lib/exam/grade";

/**
 * POST /api/exam/regrade
 *
 * Re-grade an existing attempt: loads the stored answers and re-runs AI grading
 * against the current answer keys. Used to recover attempts whose grading never
 * completed (e.g. the old auto-submit failure that left a 0 score). Does NOT
 * create a new attempt or consume quota — it updates the existing row in place.
 *
 * Body: { attemptId, subjectId }
 */
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request.clone());

    const { attemptId, subjectId } = await request.json();
    if (!attemptId || !subjectId) {
      return NextResponse.json(
        { error: "attemptId and subjectId are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey =
      cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cooldown so the (expensive) AI re-grade can't be spammed on one attempt.
    // Gates only the trigger — once it runs, grading completes in full. Per
    // attempt so a user can still re-grade a different attempt right away.
    const cd = checkCooldown(`regrade:${licenseKey}:${attemptId}`, 30_000);
    if (!cd.allowed) {
      return NextResponse.json(
        {
          error: `Tunggu ${cd.retryAfter} detik sebelum menilai ulang lagi.`,
        },
        { status: 429, headers: { "Retry-After": String(cd.retryAfter) } }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }
    if (!isGradingConfigured()) {
      return NextResponse.json(
        { error: "AI grading is not configured" },
        { status: 500 }
      );
    }

    const supabase = createServerClient()!;

    // Fetch the attempt; ownership enforced by license_key match.
    const { data: attempt } = await supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("license_key", licenseKey)
      .maybeSingle();

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Parse stored answers.
    let storedAnswers: AnswerInput[];
    try {
      const raw =
        typeof attempt.answers === "string"
          ? JSON.parse(attempt.answers)
          : attempt.answers;
      storedAnswers = Array.isArray(raw) ? raw : [];
    } catch {
      storedAnswers = [];
    }
    if (storedAnswers.length === 0) {
      return NextResponse.json(
        { error: "No answers found in this attempt" },
        { status: 400 }
      );
    }

    // Load answer keys for the current scope/subject.
    const examDataResult = (await loadExamData(
      scope,
      subjectId
    )) as ExamData | null;
    if (!examDataResult || !("answerKeys" in examDataResult)) {
      return NextResponse.json(
        { error: "Exam data not found" },
        { status: 404 }
      );
    }
    const { answerKeys, meta } = examDataResult;

    // Re-grade (shared robust grader). Throws on hard failure → caught below.
    const aiResults = await gradeChunked({
      courseName: meta.courseName,
      answerKeys,
      answers: storedAnswers,
    });
    const { results: gradingResults, totalScore, maxScore, scorePct } =
      finalizeResults(aiResults, answerKeys, meta.totalScore);

    // Persist (best-effort; never block returning the score).
    try {
      await supabase
        .from("exam_attempts")
        .update({
          grading_results: JSON.stringify(gradingResults),
          total_score: totalScore,
          max_score: maxScore,
          score_pct: scorePct,
          status: "graded",
        })
        .eq("id", attemptId);
    } catch (e) {
      console.error("Exam regrade: failed to persist (non-fatal):", e);
    }

    // Audit → admin Activity Logs (re-grade of a student's attempt).
    try {
      const { data: lk } = await supabase
        .from("license_keys")
        .select("name")
        .eq("key", licenseKey)
        .maybeSingle();
      await recordActivity(supabase, {
        action: "exam_regrade",
        userName: (lk?.name as string) || null,
        details: `${subjectId} • ${scorePct}%`,
        scope,
      });
    } catch {
      /* non-critical */
    }

    return NextResponse.json({
      attemptId,
      gradingResults,
      totalScore,
      maxScore,
      scorePct,
      durationUsedSeconds: attempt.duration_used_seconds,
      autoSubmitted: attempt.auto_submitted ?? false,
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Exam regrade error:", msg);
    return NextResponse.json(
      { error: `Gagal menilai ulang: ${msg}` },
      { status: 500 }
    );
  }
}
