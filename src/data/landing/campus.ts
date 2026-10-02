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
  /**
   * Jurusan codes taught at this campus. Being listed here does NOT make one
   * sellable — the picker still intersects this with the purchasable periods, so
   * a major whose material is unwritten simply never appears as an option.
   */
  jurusan: string[];
  locations: readonly string[];
  /**
   * How this campus names its intakes. BINUS counts batches (B29, B30); UNJ —
   * like most state universities — counts the year you enrolled. Offering a
   * BINUS batch code to a UNJ student is not a harmless extra option, it is a
   * question they cannot answer.
   */
  angkatan: readonly string[];
}

export const OTHER_LOCATION = "Lainnya";

export const CAMPUS_OPTIONS: readonly Campus[] = [
  {
    id: "BINUS",
    label: "BINUS",
    available: true,
    jurusan: ["bm"],
    locations: ["Bekasi", "Kemanggisan", "Alam Sutera"],
    angkatan: ["B29", "B30"],
  },
  {
    // Written down in full so opening UNJ is one word — `available: true` — and
    // not a research task. Still closed: Pendidikan Bahasa Arab has no material
    // yet, so a buyer who picked UNJ today would reach a dead end with no period
    // they could pay for.
    id: "UNJ",
    label: "UNJ",
    available: false,
    jurusan: ["pba"],
    locations: ["A", "B", "D", "E"],
    angkatan: ["2025", "2026"],
  },
];

/** Full names for the scope's short jurusan codes. */
export const JURUSAN_LABELS: Record<string, string> = {
  bm: "Business Management",
  pba: "Pendidikan Bahasa Arab",
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
 * Every cohort any campus offers. Kept for callers that need the full set —
 * validation, admin filters — never for a picker.
 *
 * A picker must use `angkatanForCampus()`. This flat list is where the bug
 * lived: it handed BINUS students "2025 / 2026" and would have handed UNJ
 * students "B29 / B30", because it had no idea who was asking.
 */
export const ANGKATAN_CHOICES = CAMPUS_OPTIONS.flatMap((c) => c.angkatan);

/** The intakes one campus actually has. Falls back to the first campus's. */
export function angkatanForCampus(campusId: string): readonly string[] {
  const hit = CAMPUS_OPTIONS.find((c) => c.id === campusId);
  return hit?.angkatan ?? CAMPUS_OPTIONS[0].angkatan;
}

/**
 * Which exam period a cohort is most likely buying.
 *
 * A default, never a lock — the picker underneath still opens. Newer intakes
 * sit at lower semesters: B30 and '26 are in their first year, B29 and '25 are
 * a year ahead. The same pairing holds for UNJ once PBA opens: '26 lands on
 * semester 1, '25 on semester 3.
 *
 * The cohort's OWN period wins even when it is not on sale yet. Semester 3 is
 * listed as "Segera", and landing a B29 there says the true thing — your period
 * is coming — while the old behaviour silently moved them to semester 2 UAS, a
 * period that has already happened and was never theirs. Step 1 of the checkout
 * refuses to advance on an unsellable period and says why, so nobody reaches
 * the payment screen on a period they cannot buy.
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
  const hits = (list: readonly ScopeTuple[]) =>
    list.find(
      (s) =>
        s.semester === want.semester &&
        s.examPeriod === want.examPeriod &&
        s.jurusan === jurusan
    );
  // Their own period, on sale or not (every sellable period is also an
  // available one, so one lookup covers both); otherwise the newest sellable.
  return hits(AVAILABLE_SCOPES) ?? LATEST_SCOPE;
}

/** The campus a stored location belongs to, for prefilling a returning buyer. */
export function campusForLocation(location: string): string {
  const hit = CAMPUS_OPTIONS.find((c) =>
    c.locations.some((l) => l.toLowerCase() === String(location ?? "").toLowerCase())
  );
  return hit?.id ?? CAMPUS_OPTIONS[0].id;
}
