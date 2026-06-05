// ============================================
// Scope helpers - single source of truth
// ============================================
// Parsing, serialization, validation for ScopeTuple. Imported by URL
// routing (proxy.ts, layout), API routes (requireScope), Realtime
// channel helpers, content loaders, localStorage migration.

import type { ScopeTuple, ScopeKey, ScopePath, ExamPeriod, Jurusan } from "@/types/scope";

export const MIN_SEMESTER = 1;
export const MAX_SEMESTER = 14;

export const ALLOWED_EXAM_PERIODS: readonly ExamPeriod[] = ["uts", "uas"] as const;

// Initially only Business Management active. Others surface as "Coming soon"
// placeholders in the landing scope-picker (without specific names).
export const ALLOWED_JURUSAN: readonly Jurusan[] = ["bm"] as const;

// Re-exported in src/data/index.ts; mirrored here as the authoritative
// constant. Mutating the manifest changes which scopes the app accepts.
export const AVAILABLE_SCOPES: ScopeTuple[] = [
  { semester: 1, examPeriod: "uas", jurusan: "bm" },
  { semester: 2, examPeriod: "uts", jurusan: "bm" },
  { semester: 2, examPeriod: "uas", jurusan: "bm" },
];

export function scopeKey(s: ScopeTuple): ScopeKey {
  return `s${s.semester}-${s.examPeriod}-${s.jurusan}`;
}

export function scopePath(s: ScopeTuple): ScopePath {
  return `s${s.semester}/${s.examPeriod}/${s.jurusan}`;
}

/**
 * Parse "s2-uas-bm" → ScopeTuple. Strict - rejects out-of-range semester,
 * exam not in allow-list, jurusan with path-traversal chars or wrong format.
 */
export function parseScopeKey(raw: string | null | undefined): ScopeTuple | null {
  if (!raw) return null;
  const m = /^s(\d+)-(uts|uas)-([a-z0-9-]{1,16})$/.exec(raw);
  if (!m) return null;
  const semester = parseInt(m[1], 10);
  const examPeriod = m[2] as ExamPeriod;
  const jurusan = m[3];
  if (!Number.isFinite(semester) || semester < MIN_SEMESTER || semester > MAX_SEMESTER) return null;
  if (!ALLOWED_EXAM_PERIODS.includes(examPeriod)) return null;
  if (!ALLOWED_JURUSAN.includes(jurusan)) return null;
  return { semester, examPeriod, jurusan };
}

/**
 * Parse URL segments ['s2', 'uas', 'bm'] → ScopeTuple. Used by (scoped)
 * layout's `params` resolver. Rejects '..' / '/' / extra whitespace.
 */
export function parseScopePath(segs: readonly string[]): ScopeTuple | null {
  if (!Array.isArray(segs) || segs.length < 3) return null;
  const [semSeg, examSeg, jurSeg] = segs;
  if (typeof semSeg !== "string" || !/^s\d+$/.test(semSeg)) return null;
  if (typeof examSeg !== "string" || !ALLOWED_EXAM_PERIODS.includes(examSeg as ExamPeriod)) return null;
  if (typeof jurSeg !== "string" || !/^[a-z0-9-]{1,16}$/.test(jurSeg)) return null;
  if (jurSeg.includes("..") || !ALLOWED_JURUSAN.includes(jurSeg)) return null;
  const semester = parseInt(semSeg.slice(1), 10);
  if (!Number.isFinite(semester) || semester < MIN_SEMESTER || semester > MAX_SEMESTER) return null;
  return { semester, examPeriod: examSeg as ExamPeriod, jurusan: jurSeg };
}

export function eqScope(a: ScopeTuple | null | undefined, b: ScopeTuple | null | undefined): boolean {
  if (!a || !b) return false;
  return a.semester === b.semester && a.examPeriod === b.examPeriod && a.jurusan === b.jurusan;
}

export function validateScopeTuple(s: ScopeTuple | null | undefined): boolean {
  if (!s) return false;
  if (!Number.isFinite(s.semester) || s.semester < MIN_SEMESTER || s.semester > MAX_SEMESTER) return false;
  if (!ALLOWED_EXAM_PERIODS.includes(s.examPeriod)) return false;
  if (typeof s.jurusan !== "string" || !ALLOWED_JURUSAN.includes(s.jurusan)) return false;
  return true;
}

export function isAvailableScope(s: ScopeTuple): boolean {
  return AVAILABLE_SCOPES.some((a) => eqScope(a, s));
}

export const DEFAULT_SCOPE: ScopeTuple = { semester: 2, examPeriod: "uts", jurusan: "bm" };

/**
 * The most recent scope in the manifest - last entry of AVAILABLE_SCOPES.
 * Admins land here on every fresh login so they default to the current active
 * exam period without needing to switch manually.
 *
 * Append-only - last entry defines LATEST_SCOPE used by /api/auth/validate.
 * Reordering AVAILABLE_SCOPES will silently flip the admin landing scope.
 */
export const LATEST_SCOPE: ScopeTuple = AVAILABLE_SCOPES[AVAILABLE_SCOPES.length - 1];

// ─── Human-readable labels ───

const JURUSAN_LABELS: Record<string, string> = {
  bm: "Business Management",
};

const EXAM_LABELS: Record<string, string> = {
  uts: "UTS",
  uas: "UAS",
};

/** Full label: "Semester 2 · UTS · Business Management" */
export function scopeFullLabel(s: ScopeTuple): string {
  const jur = JURUSAN_LABELS[s.jurusan] ?? s.jurusan.toUpperCase();
  const exam = EXAM_LABELS[s.examPeriod] ?? s.examPeriod.toUpperCase();
  return `Semester ${s.semester} · ${exam} · ${jur}`;
}

/** Short label: "Sem 2 UTS" */
export function scopeShortLabel(s: ScopeTuple): string {
  const exam = EXAM_LABELS[s.examPeriod] ?? s.examPeriod.toUpperCase();
  return `Sem ${s.semester} ${exam}`;
}

/** Jurusan label: "Business Management" */
export function jurusanLabel(s: ScopeTuple): string {
  return JURUSAN_LABELS[s.jurusan] ?? s.jurusan.toUpperCase();
}

/** Exam label: "UTS" or "UAS" */
export function examLabel(s: ScopeTuple): string {
  return EXAM_LABELS[s.examPeriod] ?? s.examPeriod.toUpperCase();
}

