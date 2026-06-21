import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { loadExamData } from "@/data";
import type { ExamData } from "@/types/exam";
import {
  gradeChunked,
  mockGrade,
  finalizeResults,
  isGradingConfigured,
  type GradingResult,
} from "@/lib/exam/grade";

interface SubmitBody {
  attemptId: string;
  subjectId: string;
  answers: Array<{ questionId: string; answer: string; answeredAt: string }>;
  autoSubmitted?: boolean;
}

/**
 * POST /api/exam/submit
 *
 * Submit exam answers for AI grading. Calls DeepSeek V4 Pro to grade
 * all answers against reference answers and rubrics.
 *
 * Body: { attemptId, subjectId, answers[], autoSubmitted? }
 */
export async function POST(request: Request) {
  try {
    const scope = await requireScope(request.clone());

    const body: SubmitBody = await request.json();
    const { attemptId, subjectId, answers, autoSubmitted = false } = body;

    if (!attemptId || !subjectId || !answers) {
      return NextResponse.json(
        { error: "attemptId, subjectId, and answers are required" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const licenseKey =
      cookieStore.get("hs-session")?.value?.trim().toUpperCase() ?? "";
    if (!licenseKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load exam data to get answer keys
    const examDataResult = await loadExamData(scope, subjectId) as ExamData | null;
    if (!examDataResult || !("answerKeys" in examDataResult)) {
      return NextResponse.json(
        { error: "Exam data not found" },
        { status: 404 }
      );
    }
    const { answerKeys, meta } = examDataResult;

    // Locate the attempt row (best-effort). Grading must NOT depend on the row
    // existing: if it's missing or already submitted we still grade from the
    // in-repo answer keys + the posted answers, so the user never loses their
    // work or gets stuck in a loop (the timer auto-submit was 404-ing here).
    let durationUsedSeconds: number | null = null;
    let attemptFound = false;

    if (isSupabaseServerConfigured) {
      const supabase = createServerClient()!;

      const { data: attempt } = await supabase
        .from("exam_attempts")
        .select("id, started_at, status")
        .eq("id", attemptId)
        .eq("license_key", licenseKey)
        .maybeSingle();

      if (attempt) {
        attemptFound = true;
        durationUsedSeconds = Math.round(
          (Date.now() - new Date(attempt.started_at).getTime()) / 1000
        );
        // Only flip in_progress → submitted. Re-grading an already-submitted
        // attempt is allowed (idempotent) and must not error out.
        if (attempt.status === "in_progress") {
          await supabase
            .from("exam_attempts")
            .update({
              answers: JSON.stringify(answers),
              status: "submitted",
              submitted_at: new Date().toISOString(),
              duration_used_seconds: durationUsedSeconds,
              auto_submitted: autoSubmitted,
            })
            .eq("id", attemptId);
        }
      } else {
        console.warn(
          `Exam submit: attempt ${attemptId} not found; grading from data anyway (no answers lost).`
        );
      }
    }

    // ─── AI Grading (shared robust grader; see src/lib/exam/grade.ts) ───
    // gradeWithAI throws on hard failure → the outer catch returns 500 and the
    // client retries. Answers were already saved above, so a re-grade later
    // recovers the score (no answers lost).
    let aiResults: GradingResult[];
    if (isGradingConfigured()) {
      aiResults = await gradeChunked({
        courseName: meta.courseName,
        answerKeys,
        answers,
      });
    } else {
      aiResults = mockGrade(answerKeys, answers);
    }

    const { results: gradingResults, totalScore, maxScore, scorePct } =
      finalizeResults(aiResults, answerKeys, meta.totalScore);

    // Persist grading results (best-effort; only when the row exists). A
    // failure here must not block returning the score to the user.
    if (isSupabaseServerConfigured && attemptFound) {
      try {
        await createServerClient()!
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
        console.error("Exam submit: failed to persist grading (non-fatal):", e);
      }
    }

    return NextResponse.json({
      attemptId,
      gradingResults,
      totalScore,
      maxScore,
      scorePct,
      durationUsedSeconds,
      autoSubmitted,
    });
  } catch (error) {
    if (error instanceof ScopeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Exam submit error:", error);
    return NextResponse.json(
      { error: "Gagal menilai jawaban. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
