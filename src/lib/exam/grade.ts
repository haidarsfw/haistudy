import OpenAI from "openai";
import type { ExamAnswerKey } from "@/types/exam";

/**
 * Shared exam grading logic, used by BOTH /api/exam/submit and
 * /api/exam/regrade so first-submit and re-grade behave identically and stay
 * robust against DeepSeek quirks (truncation, content-in-reasoning, markdown
 * fences, partial JSON).
 */

const DEEPSEEK_MODEL = "deepseek-v4-flash";

export interface GradingResult {
  questionId: string;
  score: number;
  maxPoints: number;
  feedback: string;
  keyPointsMatched: string[];
  keyPointsMissed: string[];
}

export interface AnswerInput {
  questionId: string;
  answer: string;
}

export function isGradingConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function buildGradingPrompt(
  courseName: string,
  answerKeys: ExamAnswerKey[],
  userAnswers: AnswerInput[]
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
6b. SOAL TRUE/FALSE: jika kunci jawaban memuat "Jawaban benar: True/False", jawaban mahasiswa diawali pilihan True atau False lalu alasan. Beri poin sesuai rubrik (umumnya 2 poin untuk pilihan True/False yang benar dan hingga 3 poin untuk alasan). Pilihan True/False yang SALAH tidak mendapat poin pilihan, tetapi alasan tetap dinilai sesuai mutunya. Toleransi bahasa tetap berlaku (mis. "Benar"/"Salah" sama dengan "True"/"False").
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

/** Close unclosed strings/objects so a length-truncated array parses. */
function repairTruncatedJson(text: string): string {
  let s = text.trim();
  if (!s.startsWith("[")) {
    const idx = s.indexOf("[");
    if (idx >= 0) s = s.substring(idx);
    else return "[]";
  }
  try {
    JSON.parse(s);
    return s;
  } catch {
    /* needs repair */
  }
  const lastCompleteObj = s.lastIndexOf("}");
  if (lastCompleteObj > 0) {
    const repaired = s.substring(0, lastCompleteObj + 1).replace(/,\s*$/, "") + "\n]";
    try {
      JSON.parse(repaired);
      return repaired;
    } catch {
      /* fall through */
    }
  }
  return s;
}

/** Brace-count individual complete {...} objects out of a partial array. */
function extractPartialResults(text: string): GradingResult[] {
  const results: GradingResult[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        try {
          const obj = JSON.parse(text.substring(objStart, i + 1));
          if (obj.questionId && typeof obj.score === "number") {
            results.push({
              questionId: obj.questionId,
              score: obj.score,
              maxPoints: obj.maxPoints ?? 0,
              feedback: obj.feedback ?? "Dinilai dari respons parsial AI.",
              keyPointsMatched: obj.keyPointsMatched ?? [],
              keyPointsMissed: obj.keyPointsMissed ?? [],
            });
          }
        } catch {
          /* skip malformed */
        }
        objStart = -1;
      }
    }
  }
  return results;
}

/**
 * Parse the model output into grading results, tolerating markdown fences,
 * surrounding prose, truncation, and JSON living in reasoning_content.
 * Throws if nothing parseable can be recovered (caller should surface an error
 * so the user can retry — never silently award 0).
 */
export function parseGradingResponse(
  content: string,
  reasoning: string | undefined,
  finishReason: string | undefined
): GradingResult[] {
  let rawAiText = (content ?? "").trim();

  // DeepSeek thinking mode sometimes returns the answer only in reasoning.
  if (!rawAiText && reasoning) {
    const jsonMatch = reasoning.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) rawAiText = jsonMatch[0];
  }
  if (!rawAiText) throw new Error("AI returned an empty response");

  let jsonText = rawAiText;
  const codeBlockMatch = rawAiText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonText = codeBlockMatch[1].trim();
  if (!jsonText.startsWith("[")) {
    const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
    if (arrayMatch) jsonText = arrayMatch[0];
  }
  if (finishReason === "length") jsonText = repairTruncatedJson(jsonText);

  try {
    return JSON.parse(jsonText) as GradingResult[];
  } catch (parseErr) {
    const partial = extractPartialResults(jsonText);
    if (partial.length > 0) return partial;
    throw new Error(`Failed to parse AI grading response: ${parseErr}`);
  }
}

/** Run AI grading. Assumes isGradingConfigured(). Throws on hard failure. */
export async function gradeWithAI(opts: {
  courseName: string;
  answerKeys: ExamAnswerKey[];
  answers: AnswerInput[];
}): Promise<GradingResult[]> {
  const deepseek = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  const prompt = buildGradingPrompt(opts.courseName, opts.answerKeys, opts.answers);
  const completion = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 8192,
    // @ts-expect-error -- DeepSeek extension: reasoning_effort + thinking
    reasoning_effort: "max",
    extra_body: { thinking: { type: "enabled" } },
  });
  const choice = completion.choices[0];
  const message = choice?.message;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reasoning = (message as any)?.reasoning_content as string | undefined;
  return parseGradingResponse(
    message?.content ?? "",
    reasoning,
    choice?.finish_reason ?? undefined
  );
}

/**
 * Grade a full exam in CHUNKS so a long exam never overflows the model's output
 * limit (the "Soal tidak dinilai oleh AI" bug): each chunk grades only ~4
 * questions against their own keys, so every response is small and complete.
 * Chunks run with limited concurrency; a failed chunk is retried once, then
 * throws (caller surfaces the error so the user can retry / re-grade).
 */
export async function gradeChunked(opts: {
  courseName: string;
  answerKeys: ExamAnswerKey[];
  answers: AnswerInput[];
}): Promise<GradingResult[]> {
  const { courseName, answerKeys, answers } = opts;
  const CHUNK_SIZE = 4;
  const CONCURRENCY = 3;

  const answerById = new Map(answers.map((a) => [a.questionId, a]));
  const chunks: ExamAnswerKey[][] = [];
  for (let i = 0; i < answerKeys.length; i += CHUNK_SIZE) {
    chunks.push(answerKeys.slice(i, i + CHUNK_SIZE));
  }

  const collected: GradingResult[] = [];
  let next = 0;
  async function worker() {
    while (next < chunks.length) {
      const keys = chunks[next++];
      const chunkAnswers = keys.map(
        (k) => answerById.get(k.questionId) ?? { questionId: k.questionId, answer: "" }
      );
      let res: GradingResult[] | null = null;
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          res = await gradeWithAI({ courseName, answerKeys: keys, answers: chunkAnswers });
        } catch (e) {
          lastErr = e;
        }
      }
      if (!res) throw lastErr instanceof Error ? lastErr : new Error("chunk grading failed");
      collected.push(...res);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, () => worker())
  );
  return collected;
}

/** Dev-only stand-in when no DEEPSEEK_API_KEY is set. */
export function mockGrade(
  answerKeys: ExamAnswerKey[],
  answers: AnswerInput[]
): GradingResult[] {
  return answerKeys.map((k) => {
    const userAnswer = answers.find((a) => a.questionId === k.questionId);
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

/** Ensure every key has a result, cap to [0, maxPoints], and compute totals. */
export function finalizeResults(
  gradingResults: GradingResult[],
  answerKeys: ExamAnswerKey[],
  examTotalScore: number
): {
  results: GradingResult[];
  totalScore: number;
  maxScore: number;
  scorePct: number;
} {
  const results = [...gradingResults];
  for (const key of answerKeys) {
    if (!results.find((r) => r.questionId === key.questionId)) {
      results.push({
        questionId: key.questionId,
        score: 0,
        maxPoints: key.maxPoints,
        feedback: "Soal tidak dinilai oleh AI.",
        keyPointsMatched: [],
        keyPointsMissed: [],
      });
    }
  }
  for (const r of results) {
    const key = answerKeys.find((k) => k.questionId === r.questionId);
    if (key && r.score > key.maxPoints) r.score = key.maxPoints;
    if (r.score < 0) r.score = 0;
  }
  const totalScore =
    Math.round(results.reduce((s, r) => s + r.score, 0) * 10) / 10;
  const maxScore = examTotalScore;
  const scorePct = Math.round((totalScore / maxScore) * 1000) / 10;
  return { results, totalScore, maxScore, scorePct };
}
