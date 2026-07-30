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

// Jurusan codes the URL parser will accept at all. A code listed here still
// needs SCOPE_REGISTRY entries before anything is reachable.
export const ALLOWED_JURUSAN: readonly Jurusan[] = ["bm", "pba"] as const;

/**
 * How far along a period is, in the only three states that change behaviour.
 *
 *   open      Sold, reachable, listed everywhere. The normal state.
 *   upcoming  Reachable and listed, but NOT sellable — content is still being
 *             written. Shown as "Segera" wherever a period can be picked.
 *   hidden    Exists in the loader map and in the database, reachable by
 *             nobody. `parseScopePath` refuses it, so the URL 404s, the admin
 *             switcher never lists it, and /api/payments rejects it. This is a
 *             folder waiting for the day it is promoted, nothing more.
 *
 * Promotion is a one-word edit here. Nothing else needs to change: the folders,
 * the loaders and the feature-flag rows are already in place.
 */
export type ScopeStage = "open" | "upcoming" | "hidden";

export interface ScopeEntry extends ScopeTuple {
  stage: ScopeStage;
}

/**
 * Every period that exists in code, in the order they were opened.
 *
 * The single place a period is declared. `AVAILABLE_SCOPES` (what is
 * reachable), `PURCHASABLE_SCOPES` (what is sellable) and `LATEST_SCOPE` (where
 * an admin lands) are all derived from it, so they cannot drift apart.
 */
export const SCOPE_REGISTRY: readonly ScopeEntry[] = [
  // BINUS — Business Management. Written, sold, in use.
  { semester: 1, examPeriod: "uts", jurusan: "bm", stage: "open" },
  { semester: 1, examPeriod: "uas", jurusan: "bm", stage: "open" },
  { semester: 2, examPeriod: "uts", jurusan: "bm", stage: "open" },
  { semester: 2, examPeriod: "uas", jurusan: "bm", stage: "open" },
  // BINUS — Business Management, semester 3. Empty; UAS not shown yet.
  { semester: 3, examPeriod: "uts", jurusan: "bm", stage: "upcoming" },
  { semester: 3, examPeriod: "uas", jurusan: "bm", stage: "hidden" },
  // UNJ — Pendidikan Bahasa Arab. Semester 1 is for the '26 intake, semester 3
  // for '25; semesters 2 and 4 follow only if the course is continued.
  { semester: 1, examPeriod: "uts", jurusan: "pba", stage: "upcoming" },
  { semester: 1, examPeriod: "uas", jurusan: "pba", stage: "hidden" },
  { semester: 3, examPeriod: "uts", jurusan: "pba", stage: "upcoming" },
  { semester: 3, examPeriod: "uas", jurusan: "pba", stage: "hidden" },
];

/**
 * Periods that exist as far as the app is concerned: routable, loadable,
 * listable. Re-exported by src/data/index.ts so there is one list, not two.
 *
 * Excludes `hidden` on purpose — a hidden period must be unreachable, and this
 * is the list the URL parser and the admin switcher both read.
 */
export const AVAILABLE_SCOPES: ScopeTuple[] = SCOPE_REGISTRY.filter(
  (s) => s.stage !== "hidden"
).map(({ semester, examPeriod, jurusan }) => ({ semester, examPeriod, jurusan }));

/**
 * Periods a buyer can actually pay for.
 *
 * Selling a period with no material in it is the one expensive mistake here:
 * the money arrives, the buyer opens an empty app, and there is no way to give
 * them what they paid for. Waiting costs nothing.
 */
export const PURCHASABLE_SCOPES: ScopeTuple[] = SCOPE_REGISTRY.filter(
  (s) => s.stage === "open"
).map(({ semester, examPeriod, jurusan }) => ({ semester, examPeriod, jurusan }));

/** The stage of a period, or null if it was never declared. */
export function scopeStage(s: ScopeTuple | null | undefined): ScopeStage | null {
  if (!s) return null;
  const hit = SCOPE_REGISTRY.find(
    (e) =>
      e.semester === s.semester &&
      e.examPeriod === s.examPeriod &&
      e.jurusan === s.jurusan
  );
  return hit?.stage ?? null;
}

/** Can this period be bought right now? Checked on the server, not just in the UI. */
export function isPurchasableScope(s: ScopeTuple | null | undefined): boolean {
  return scopeStage(s) === "open";
}

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
 * The newest period actually on sale - last `open` entry of SCOPE_REGISTRY.
 * Admins land here on every fresh login, and it is the default period in
 * /payments, so it must never be an empty one: landing an admin (or a buyer's
 * pre-filled order) on a period with no material in it looks like a broken app.
 *
 * Append-only. Reordering the `open` entries silently moves both.
 */
export const LATEST_SCOPE: ScopeTuple =
  PURCHASABLE_SCOPES[PURCHASABLE_SCOPES.length - 1];

// ─── Human-readable labels ───

const JURUSAN_LABELS: Record<string, string> = {
  bm: "Business Management",
  pba: "Pendidikan Bahasa Arab",
};

const EXAM_LABELS: Record<string, string> = {
  uts: "UTS",
  uas: "UAS",
};

/**
 * Full label: "Semester 2: UAS Business Management"
 *
 * One colon, then the period read as a phrase. The old
 * "Semester 2 · UTS · Business Management" chopped it into three equal shards,
 * which made three unrelated facts out of one name. This is the wording used
 * everywhere the period is spelled out — invoices, admin, checkout, dashboard,
 * account — so there is nothing to keep in sync.
 */
export function scopeFullLabel(s: ScopeTuple): string {
  const jur = JURUSAN_LABELS[s.jurusan] ?? s.jurusan.toUpperCase();
  const exam = EXAM_LABELS[s.examPeriod] ?? s.examPeriod.toUpperCase();
  return `Semester ${s.semester}: ${exam} ${jur}`;
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

