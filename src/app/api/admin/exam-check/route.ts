import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { parseScopeKey } from "@/lib/scope";
import { loadCourses, loadRangkuman, loadContent, loadKilat } from "@/data";
import {
  isCheckConfigured,
  aiCheckChunked,
  aiHeuristics,
  combineAi,
  collectStrings,
  plagiarismScore,
  buildMateriShingles,
  wordCount,
  MIN_WORDS_FOR_AI_LLM,
  type CheckItem,
  type AiVerdict,
} from "@/lib/exam/check";
import type { UserExamAnswer } from "@/types/exam";

/**
 * POST /api/admin/exam-check  { attemptId }
 *
 * Admin-only. Estimates, per answered question, (a) AI-generated likelihood
 * (DeepSeek, strict prompt) and (b) verbatim overlap with the course materi
 * (local, deterministic), then averages them to one attempt-level number each.
 *
 * Ephemeral: nothing written to the DB. The only external cost is a few
 * DeepSeek calls (admin-initiated, rare). Plagiarism uses zero tokens.
 */

interface PerQuestion {
  plagPct: number;
  plagTooShort: boolean;
  aiLikelihood: number | null;
  aiAssessed: boolean;
  aiLlmUsed: boolean;
  reason: string;
}

const mean = (xs: number[]) =>
  xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

export async function POST(request: Request) {
  try {
    const { authorized } = await validateAdmin();
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      attemptId?: string;
    };
    const attemptId = body.attemptId;
    if (!attemptId) {
      return NextResponse.json(
        { error: "attemptId is required" },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const supabase = createServerClient()!;
    const { data: attempt, error } = await supabase
      .from("exam_attempts")
      .select("id, scope_key, subject_id, answers")
      .eq("id", attemptId)
      .maybeSingle();

    if (error) throw error;
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const row = attempt as unknown as {
      scope_key: string;
      subject_id: string;
      answers: unknown;
    };

    const scope = parseScopeKey(row.scope_key);
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope on attempt" }, { status: 400 });
    }

    // Parse answers (jsonb or stringified).
    const rawAnswers =
      typeof row.answers === "string" ? JSON.parse(row.answers) : row.answers;
    const answers: UserExamAnswer[] = Array.isArray(rawAnswers) ? rawAnswers : [];
    const answered = answers.filter(
      (a) => a && typeof a.answer === "string" && a.answer.trim().length > 0
    );

    // Course name (for the AI prompt) + materi text (for plagiarism), both
    // from in-repo data — zero DB.
    const courses = await loadCourses(scope).catch(() => []);
    const courseName =
      courses.find((c) => c.id === row.subject_id)?.name ?? row.subject_id;

    // Materi corpus for plagiarism — broaden beyond rangkuman to content +
    // kilat so a real copy is caught wherever the student read it. All in-repo
    // (zero DB). collectStrings walks every string leaf of each structure.
    const [rk, content, kilat] = await Promise.all([
      loadRangkuman(scope, row.subject_id).catch(() => null),
      loadContent(scope, row.subject_id).catch(() => null),
      loadKilat(scope, row.subject_id).catch(() => null),
    ]);
    const materi = collectStrings([rk, content, kilat]).join("\n");
    const materiShingles = buildMateriShingles(materi);
    const materiAvailable = materiShingles.size > 0;

    // LLM judgment only for answers long enough to judge reliably; the local
    // heuristic applies to every answered question regardless.
    const aiConfigured = isCheckConfigured();
    const aiItems: CheckItem[] = answered
      .filter((a) => wordCount(a.answer) >= MIN_WORDS_FOR_AI_LLM)
      .map((a) => ({ questionId: a.questionId, answer: a.answer }));
    const aiMap: Map<string, AiVerdict> =
      aiConfigured && aiItems.length > 0
        ? await aiCheckChunked(courseName, aiItems)
        : new Map<string, AiVerdict>();

    // Per-question results. AI = heuristic blended with LLM (when available).
    const perQuestion: Record<string, PerQuestion> = {};
    for (const a of answered) {
      const plag = plagiarismScore(a.answer, materiShingles);
      const h = aiHeuristics(a.answer);
      const v = aiMap.get(a.questionId);
      const aiLikelihood = combineAi(h, v ? v.aiLikelihood : null);
      perQuestion[a.questionId] = {
        plagPct: plag.pct,
        plagTooShort: plag.tooShort,
        aiLikelihood,
        aiAssessed: true,
        aiLlmUsed: Boolean(v),
        reason: v?.reason || (h.signals.length ? `Ciri: ${h.signals.join(", ")}` : ""),
      };
    }

    // Attempt-level averages (accumulated from per-question).
    const plagVals = answered
      .map((a) => perQuestion[a.questionId])
      .filter((p) => p && !p.plagTooShort)
      .map((p) => p.plagPct);
    const aiVals = answered
      .map((a) => perQuestion[a.questionId])
      .filter((p) => p && p.aiLikelihood != null)
      .map((p) => p.aiLikelihood as number);

    return NextResponse.json({
      ok: true,
      overall: {
        aiPct: mean(aiVals),
        plagPct: mean(plagVals),
        answered: answered.length,
        aiLlmUsed: aiItems.length,
        materiAvailable,
        aiConfigured,
      },
      perQuestion,
    });
  } catch (err) {
    console.error("Admin exam-check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
