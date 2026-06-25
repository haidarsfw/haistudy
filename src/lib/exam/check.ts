import OpenAI from "openai";

/**
 * Admin-only "Cek" logic: estimate (a) how likely each exam answer is
 * AI-generated, and (b) how much of it is copied verbatim from the course
 * materi. Used by /api/admin/exam-check. Ephemeral — nothing is persisted.
 *
 * AI likelihood = HYBRID of two deterministic-ish signals, blended:
 *   1. Local heuristics (aiHeuristics): the concrete "inhuman" tells — em-dash,
 *      smart quotes, stacked formal connectors, uniform long sentences, total
 *      absence of informality. These fire reliably on obvious AI text and are
 *      fully deterministic.
 *   2. DeepSeek V4 Flash judgment with a calibrated, band-based prompt
 *      (temperature 0 + thinking off).
 * Plagiarism = DETERMINISTIC local n-gram overlap vs the materi corpus.
 */

const DEEPSEEK_MODEL = "deepseek-v4-flash";

// Tuning knobs.
export const SHINGLE_N = 4; // word n-gram size for verbatim overlap
export const MIN_WORDS_FOR_PLAGIARISM = SHINGLE_N;
export const MIN_WORDS_FOR_AI_LLM = 12; // below this we skip the LLM (heuristic still applies)

export interface CheckItem {
  questionId: string;
  answer: string;
}

export interface AiVerdict {
  questionId: string;
  aiLikelihood: number; // 0..100
  reason: string;
}

export function isCheckConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

// ─── Text utils ───
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ");
}
function normalizeWords(s: string): string[] {
  return stripHtml(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function shingles(words: string[], n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(" "));
  return set;
}

/** Recursively collect every string leaf from in-repo materi structures. */
export function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) collectStrings(v, out);
  return out;
}

// ─── Plagiarism (deterministic, local) ───
export interface PlagiarismResult {
  pct: number; // % of the answer's word n-grams found verbatim in the materi
  tooShort: boolean;
}

export function buildMateriShingles(materi: string): Set<string> {
  return shingles(normalizeWords(materi), SHINGLE_N);
}

export function plagiarismScore(
  answer: string,
  materiShingles: Set<string>
): PlagiarismResult {
  const words = normalizeWords(answer);
  if (words.length < MIN_WORDS_FOR_PLAGIARISM) return { pct: 0, tooShort: true };
  const ans = shingles(words, SHINGLE_N);
  if (ans.size === 0) return { pct: 0, tooShort: true };
  if (materiShingles.size === 0) return { pct: 0, tooShort: false };
  let matched = 0;
  for (const sh of ans) if (materiShingles.has(sh)) matched++;
  return { pct: Math.round((matched / ans.size) * 100), tooShort: false };
}

export function wordCount(s: string): number {
  return normalizeWords(s).length;
}

// ─── AI heuristics (deterministic textual "tells") ───
export interface AiHeuristics {
  score: number; // 0..100
  signals: string[];
  informal: boolean;
  strongTell: boolean; // combo that is essentially never human exam writing
}

const FORMAL_CONNECTORS = [
  "selain itu",
  "di sisi lain",
  "dengan demikian",
  "secara keseluruhan",
  "pada dasarnya",
  "hal ini menunjukkan",
  "oleh karena itu",
  "lebih lanjut",
  "sebagai kesimpulan",
  "dapat disimpulkan",
  "perlu dicatat",
  "penting untuk dicatat",
  "secara umum",
  "di samping itu",
  "tidak hanya itu",
  "dalam konteks ini",
  "hal ini disebabkan",
];

const INFORMAL_RE =
  /\b(yg|tdk|dgn|gak|nggak|ga|gk|udh|udah|aja|aku|gua|gue|gw|kayak|gitu|kalo|tp|krn|sm|jd|bgt|dr|utk|sih|deh|dong|nih)\b/i;

export function aiHeuristics(answer: string): AiHeuristics {
  const text = answer ?? "";
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const signals: string[] = [];
  let score = 0;

  const emDash = /[—–]/.test(text); // true em/en dash, NOT hyphen "-"
  const smartQuotes = /[“”‘’]/.test(text);
  const nConn = FORMAL_CONNECTORS.filter((c) => lower.includes(c)).length;
  const bullets = (text.match(/^\s*(?:[-*•]|\d+[.)])\s+/gm) || []).length;
  const informal = INFORMAL_RE.test(text);

  if (emDash) {
    score += 30;
    signals.push("tanda em-dash (—)");
  }
  if (smartQuotes) {
    score += 20;
    signals.push("tanda kutip melengkung");
  }
  if (nConn >= 3) {
    score += 22;
    signals.push(`${nConn} frasa transisi formal`);
  } else if (nConn === 2) score += 12;
  else if (nConn === 1) score += 5;

  if (bullets >= 3) {
    score += 12;
    signals.push("daftar terstruktur rapi");
  }

  // Uniform, long sentences (a hallmark of generated prose).
  const sents = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3);
  if (sents.length >= 4) {
    const lens = sents.map((s) => s.split(/\s+/).length);
    const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
    const sd = Math.sqrt(
      lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length
    );
    if (avg >= 14 && sd / avg < 0.45) {
      score += 15;
      signals.push("kalimat panjang & seragam");
    }
  }

  // Bilingual glosses — "istilah Indonesia (English Term)" — an AI habit.
  const engGloss = (text.match(/\([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+){0,4}\)/g) || [])
    .length;
  if (engGloss >= 2) {
    score += 12;
    signals.push("istilah Inggris dalam kurung");
  }
  // Formatted sub-headings (short line ending with ":") — AI structures answers.
  const headings = (text.match(/^[^\n]{0,60}:\s*$/gm) || []).length;
  if (headings >= 2) {
    score += 10;
    signals.push("sub-judul berformat");
  }

  // Long, perfectly clean prose (no informality, substantial length).
  if (!informal && words.length >= 60) score += 10;

  // Human counter-signals.
  if (informal) {
    score -= 35;
    signals.push("(bahasa informal/singkatan → manusia)");
  }
  if (words.length < 25) score -= 15; // too short to judge confidently

  // In a plain exam textarea, an em-dash is essentially always pasted (students
  // type "-", never "—") → strong tell on its own. Smart quotes alone are
  // weaker (mobile autocorrect can produce them), so they need corroboration.
  const strongTell = emDash || (smartQuotes && nConn >= 2);

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    signals,
    informal,
    strongTell,
  };
}

/**
 * Blend heuristic with the LLM judgment. We take the MORE suspicious of the two
 * (not an average): the LLM catches AI prose that has no typographic tells,
 * while the heuristic catches tells the model misses — averaging would let each
 * drag the other down. Strong deterministic tells set a high floor; clear human
 * markers (informality) cap it.
 */
export function combineAi(h: AiHeuristics, llm: number | null): number {
  let score = llm == null ? h.score : Math.max(llm, h.score);
  if (h.strongTell) score = Math.max(score, 80);
  if (h.informal) score = Math.min(score, 35);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ─── LLM judgment (DeepSeek, calibrated) ───
export function buildAiCheckPrompt(courseName: string, items: CheckItem[]): string {
  const block = items
    .map((it, i) => `### Jawaban ${i + 1} (questionId: ${it.questionId})\n${it.answer.trim()}`)
    .join("\n\n");

  return `Kamu pendeteksi tulisan AI yang akurat untuk jawaban ujian mahasiswa mata kuliah "${courseName}" di BINUS. Untuk SETIAP jawaban, beri "aiLikelihood" 0-100 = kemungkinan teks DITULIS OLEH AI (ChatGPT/Gemini/dsb), bukan diketik sendiri oleh mahasiswa saat ujian.

PANDUAN SKOR:
- 80-100: BANYAK ciri AI kuat sekaligus — struktur sempurna & seimbang; frasa transisi formal bertubi ("Selain itu", "Di sisi lain", "Dengan demikian", "Secara keseluruhan"); ada em-dash (—) atau tanda kutip melengkung; kalimat panjang seragam tanpa typo; definisi ensiklopedis sangat lengkap melebihi yang diminta; nada netral "buku teks".
- 50-79: beberapa ciri AI tapi bercampur gaya manusia.
- 20-49: dominan terasa tulisan manusia; ciri AI lemah/sedikit.
- 0-19: jelas manusia — ada typo, singkatan ("yg","tdk","dgn"), bahasa informal/campur, jawaban pendek/melompat, gaya personal.

PENTING (hindari salah tuduh):
- Formalitas ATAU kebenaran ATAU kerapian SAJA bukan bukti kuat; perlu KOMBINASI beberapa ciri untuk skor tinggi.
- Bahasa Inggris yang tidak sempurna BUKAN bukti AI.
- Jawaban sangat pendek → maksimal 30.
- Nilai GAYA penulisan, BUKAN benar/salah materinya.

KONSISTEN: pola serupa harus dapat skor serupa.

OUTPUT: HANYA JSON array valid tanpa markdown, satu objek per jawaban, urut sesuai input:
[{"questionId":"<id>","aiLikelihood":0,"reason":"1 kalimat alasan singkat Bahasa Indonesia"}]

JAWABAN-JAWABAN MAHASISWA:
${block}`;
}

function tolerantParseArray(content: string): unknown[] {
  const text = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return v;
  } catch {
    /* fall through */
  }
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const v = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(v)) return v;
    } catch {
      /* give up */
    }
  }
  return [];
}

async function aiCheckOnce(courseName: string, items: CheckItem[]): Promise<AiVerdict[]> {
  const deepseek = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
    timeout: 60_000,
    maxRetries: 0,
  });
  const body = {
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: buildAiCheckPrompt(courseName, items) }],
    max_tokens: 2048,
    temperature: 0,
    thinking: { type: "disabled" },
  } as unknown as Parameters<typeof deepseek.chat.completions.create>[0];

  const completion = (await deepseek.chat.completions.create(body)) as {
    choices: Array<{ message?: { content?: string } }>;
  };
  const raw = tolerantParseArray(completion.choices[0]?.message?.content ?? "");
  const out: AiVerdict[] = [];
  for (const r of raw) {
    const o = r as Record<string, unknown>;
    const qid = typeof o.questionId === "string" ? o.questionId : null;
    if (!qid) continue;
    let pct = Number(o.aiLikelihood);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    out.push({
      questionId: qid,
      aiLikelihood: pct,
      reason: typeof o.reason === "string" ? o.reason : "",
    });
  }
  return out;
}

/** Run the LLM judgment over many answers in small chunks (bounded output). */
export async function aiCheckChunked(
  courseName: string,
  items: CheckItem[]
): Promise<Map<string, AiVerdict>> {
  const CHUNK = 6;
  const byId = new Map<string, AiVerdict>();
  const chunks: CheckItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) chunks.push(items.slice(i, i + CHUNK));
  for (const chunk of chunks) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const missing = chunk.filter((c) => !byId.has(c.questionId));
      if (missing.length === 0) break;
      try {
        const res = await aiCheckOnce(courseName, missing);
        for (const v of res) if (!byId.has(v.questionId)) byId.set(v.questionId, v);
      } catch {
        /* retry once; unassessed ids simply fall back to heuristic-only */
      }
    }
  }
  return byId;
}
