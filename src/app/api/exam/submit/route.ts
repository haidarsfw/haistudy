import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { requireScope, ScopeError } from "@/lib/auth/scope-check";
import { scopeKey } from "@/lib/scope";
import { loadExamData } from "@/data";
import type { ExamAnswerKey, ExamData } from "@/types/exam";

// ─── Config ───
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = "deepseek-v4-flash"; // Flash + thinking for cost-effective accurate grading

interface SubmitBody {
  attemptId: string;
  subjectId: string;
  answers: Array<{ questionId: string; answer: string; answeredAt: string }>;
  autoSubmitted?: boolean;
}

interface GradingResult {
  questionId: string;
  score: number;
  maxPoints: number;
  feedback: string;
  keyPointsMatched: string[];
  keyPointsMissed: string[];
}

function buildGradingPrompt(
  courseName: string,
  answerKeys: ExamAnswerKey[],
  userAnswers: Array<{ questionId: string; answer: string }>,
  userLanguage: string
): string {
  return `Kamu adalah penilai ujian akademis untuk mata kuliah ${courseName} di BINUS University.

TUGAS: Nilailah jawaban mahasiswa berdasarkan kunci jawaban dan rubrik yang diberikan.

ATURAN PENILAIAN:
1. Skor harus REALISTIS dan TIDAK BIAS. Berikan skor desimal jika perlu (misalnya 3.5, 7.5). Tidak perlu kelipatan 5 atau 10. Jika jawaban sedikit benar, berikan skor rendah seperti 2 atau 3.
2. BAHASA TIDAK MASALAH. Jika jawaban ditulis dalam bahasa yang berbeda dari kunci jawaban, yang penting adalah SUBSTANSI dan INTI POIN jawaban, bukan bahasanya. Jawaban dalam bahasa Inggris, Indonesia, atau campuran keduanya semuanya valid.
3. Nilailah berdasarkan RUBRIK yang diberikan. Setiap komponen rubrik memiliki poin tertentu. Berikan poin penuh hanya jika komponen tersebut dijelaskan dengan BENAR dan LENGKAP.
4. Poin parsial diperbolehkan. Jika mahasiswa menyebut konsep yang benar tapi kurang lengkap atau kurang tepat penjelasannya, berikan sebagian poin.
5. Jika mahasiswa menambahkan informasi yang TIDAK ADA di materi tetapi secara konseptual benar, itu TIDAK menambah poin tetapi juga TIDAK mengurangi poin.
6. Jika jawaban KOSONG atau hanya berisi teks tidak relevan, berikan skor 0.
7. Feedback HARUS SELALU dalam bahasa Indonesia, konstruktif, dan menjelaskan mengapa skor diberikan.
8. Identifikasi key points yang MATCHED dan yang MISSED berdasarkan rubrik — tulis juga dalam bahasa Indonesia.
9. Jangan pernah memberikan skor di atas maxPoints untuk soal tersebut.
10. Totalkan skor dari komponen rubrik. Jangan asal tebak skor keseluruhan.

FORMAT OUTPUT: Kembalikan HANYA JSON array valid tanpa markdown code block, tanpa penjelasan tambahan:
[
  {
    "questionId": "essay-1",
    "score": 7.5,
    "maxPoints": 10,
    "feedback": "Penjelasan lengkap...",
    "keyPointsMatched": ["Poin yang benar 1", "Poin yang benar 2"],
    "keyPointsMissed": ["Poin yang kurang 1"]
  }
]

KUNCI JAWABAN DAN RUBRIK:
${JSON.stringify(
    answerKeys.map((k) => ({
      questionId: k.questionId,
      maxPoints: k.maxPoints,
      referenceAnswer: k.referenceAnswer,
      rubric: k.rubric,
    })),
    null,
    2
  )}

JAWABAN MAHASISWA:
${JSON.stringify(
    userAnswers.map((a) => ({
      questionId: a.questionId,
      answer: a.answer || "(KOSONG - tidak dijawab)",
    })),
    null,
    2
  )}`;
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
    const sk = scopeKey(scope);

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

    // Calculate duration
    let durationUsedSeconds: number | null = null;
    let startedAt: string | null = null;

    if (isSupabaseServerConfigured) {
      const supabase = createServerClient()!;

      // Validate attempt belongs to user and is in_progress
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
          { error: "Attempt already submitted" },
          { status: 400 }
        );
      }

      startedAt = attempt.started_at;
      durationUsedSeconds = Math.round(
        (Date.now() - new Date(attempt.started_at).getTime()) / 1000
      );

      // Update status to 'submitted' and save answers
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

    // ─── AI Grading ───
    let gradingResults: GradingResult[];

    if (DEEPSEEK_API_KEY) {
      const deepseek = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: DEEPSEEK_API_KEY,
      });

      const examLang =
        isSupabaseServerConfigured && startedAt
          ? (
              await createServerClient()!
                .from("exam_attempts")
                .select("exam_language")
                .eq("id", attemptId)
                .maybeSingle()
            )?.data?.exam_language ?? "id"
          : "id";

      const prompt = buildGradingPrompt(
        meta.courseName,
        answerKeys,
        answers,
        examLang
      );

      const completion = await deepseek.chat.completions.create({
        model: DEEPSEEK_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8192,
        // @ts-expect-error -- DeepSeek extension: reasoning_effort + thinking
        reasoning_effort: "max",
        extra_body: {
          thinking: { type: "enabled" },
        },
      });

      const rawText =
        completion.choices[0]?.message?.content?.trim() ?? "[]";

      // Parse JSON - handle potential markdown code blocks
      let jsonText = rawText;
      const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }

      try {
        gradingResults = JSON.parse(jsonText) as GradingResult[];
      } catch {
        console.error("Failed to parse AI grading response:", rawText);
        // Fallback: give 0 for all
        gradingResults = answerKeys.map((k) => ({
          questionId: k.questionId,
          score: 0,
          maxPoints: k.maxPoints,
          feedback:
            "Maaf, terjadi kesalahan saat menilai jawaban ini. Silakan hubungi admin.",
          keyPointsMatched: [],
          keyPointsMissed: [],
        }));
      }
    } else {
      // Mock grading for dev without API key
      gradingResults = answerKeys.map((k) => {
        const userAnswer = answers.find(
          (a) => a.questionId === k.questionId
        );
        const hasAnswer = (userAnswer?.answer ?? "").trim().length > 10;
        const mockScore = hasAnswer
          ? Math.round(k.maxPoints * (0.5 + Math.random() * 0.4) * 10) / 10
          : 0;
        return {
          questionId: k.questionId,
          score: mockScore,
          maxPoints: k.maxPoints,
          feedback: hasAnswer
            ? "Ini adalah penilaian demo. Untuk penilaian AI yang sebenarnya, konfigurasi DEEPSEEK_API_KEY."
            : "Soal tidak dijawab.",
          keyPointsMatched: hasAnswer ? ["(demo mode)"] : [],
          keyPointsMissed: hasAnswer ? [] : ["Tidak ada jawaban"],
        };
      });
    }

    // Ensure all answer keys have a grading result
    for (const key of answerKeys) {
      if (!gradingResults.find((r) => r.questionId === key.questionId)) {
        gradingResults.push({
          questionId: key.questionId,
          score: 0,
          maxPoints: key.maxPoints,
          feedback: "Soal tidak dinilai oleh AI.",
          keyPointsMatched: [],
          keyPointsMissed: [],
        });
      }
    }

    // Cap scores at maxPoints
    for (const r of gradingResults) {
      const key = answerKeys.find((k) => k.questionId === r.questionId);
      if (key && r.score > key.maxPoints) {
        r.score = key.maxPoints;
      }
      if (r.score < 0) r.score = 0;
    }

    const totalScore = Math.round(
      gradingResults.reduce((s, r) => s + r.score, 0) * 10
    ) / 10;
    const maxScore = meta.totalScore;
    const scorePct = Math.round((totalScore / maxScore) * 1000) / 10;

    // Update attempt with grading results
    if (isSupabaseServerConfigured) {
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
