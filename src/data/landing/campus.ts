import { AVAILABLE_SCOPES, LATEST_SCOPE } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

/**
 * Where a buyer studies, as a chain.
 *
 * Kampus → Jurusan → Lokasi kampus → Kelas. Each step narrows the next, which
 * is the whole reason it is a chain and not four unrelated dropdowns: someone
 * at Bekasi should never be offered a Kemanggisan class code, and picking one
 * by accident lands in the admin queue as a purchase nobody can place.
 */

export interface Campus {
  id: string;
  label: string;
  /** UNJ is shown but cannot be chosen: there is no material for it yet. */
  available: boolean;
  /** Scope codes sold under this campus. Empty means nothing to sell. */
  jurusan: string[];
  locations: readonly string[];
}

export const OTHER_LOCATION = "Lainnya";

export const CAMPUS_OPTIONS: readonly Campus[] = [
  {
    id: "BINUS",
    label: "BINUS",
    available: true,
    jurusan: ["bm"],
    locations: ["Bekasi", "Kemanggisan", "Alam Sutera"],
  },
  {
    id: "UNJ",
    label: "UNJ",
    available: false,
    jurusan: [],
    locations: ["A", "B", "D", "E"],
  },
];

/** Full names for the scope's two-letter jurusan codes. */
export const JURUSAN_LABELS: Record<string, string> = {
  bm: "Business Management",
};

/**
 * Class codes actually used by buyers, grouped by where they study.
 *
 * Taken from real purchases rather than invented — Bekasi runs the 86 stream,
 * Kemanggisan and Alam Sutera do not, and offering one to the other is how
 * "LB 86 dan LA86" ended up typed into a free-text box. The list is a
 * shortcut, never a fence: every location keeps "Lainnya" for the codes that
 * appear each new semester.
 */
export const CLASSES_BY_LOCATION: Record<string, readonly string[]> = {
  Bekasi: ["LA86", "LB86", "LC86", "LD86", "LE86", "LJ21", "LK21"],
  Kemanggisan: ["LB30", "LC21", "LD21"],
  "Alam Sutera": ["LD24", "LI21"],
};

/**
 * A hand-typed class code, in the one shape the database should hold.
 *
 * Case, spaces and dashes are thrown away, because "Lb-30" and "LB30" are the
 * same class and were being counted as two. Capped short enough that a
 * sentence cannot masquerade as a code.
 */
export function normalizeClassCode(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

/**
 * Cohorts, trimmed to the four that can actually buy something.
 *
 * The old list ran B27 to B32 plus four calendar years, most of which have
 * either graduated or not arrived. A dropdown of ten where only four are real
 * is ten chances to pick wrong.
 */
export const ANGKATAN_CHOICES = ["B29", "B30", "2025", "2026"] as const;

/**
 * Which exam period a cohort is most likely buying.
 *
 * A default, never a lock — the picker underneath still opens. Newer intakes
 * sit at lower semesters: B30 and '26 are in their first year, B29 and '25 are
 * a year ahead.
 *
 * Semester 3 does not exist in AVAILABLE_SCOPES yet, so the older pair falls
 * through to the newest thing on sale. Guessing a period nobody can buy would
 * be worse than not guessing at all.
 */
const ANGKATAN_SCOPE: Record<string, { semester: number; examPeriod: "uts" | "uas" }> = {
  B30: { semester: 1, examPeriod: "uts" },
  "2026": { semester: 1, examPeriod: "uts" },
  B29: { semester: 3, examPeriod: "uts" },
  "2025": { semester: 3, examPeriod: "uts" },
};

export function defaultScopeForAngkatan(
  angkatan: string,
  jurusan = "bm"
): ScopeTuple {
  const want = ANGKATAN_SCOPE[String(angkatan ?? "").toUpperCase()];
  if (!want) return LATEST_SCOPE;
  const match = AVAILABLE_SCOPES.find(
    (s) =>
      s.semester === want.semester &&
      s.examPeriod === want.examPeriod &&
      s.jurusan === jurusan
  );
  return match ?? LATEST_SCOPE;
}

/** The campus a stored location belongs to, for prefilling a returning buyer. */
export function campusForLocation(location: string): string {
  const hit = CAMPUS_OPTIONS.find((c) =>
    c.locations.some((l) => l.toLowerCase() === String(location ?? "").toLowerCase())
  );
  return hit?.id ?? CAMPUS_OPTIONS[0].id;
}
