// ============================================
// Scope types — (semester, exam_period, jurusan)
// ============================================
// Defines the tuple that scopes every cohort-shared row + URL +
// Realtime channel. NO YEAR — junior cohorts inherit the same scope
// room when they redeem a new key with matching (semester, exam, jurusan).

export type ExamPeriod = "uts" | "uas";

// Always lowercase kebab-cased. Validated by ALLOWED_JURUSAN in @/lib/scope.
export type Jurusan = string;

export interface ScopeTuple {
  semester: number;       // 1..14, MIN_SEMESTER/MAX_SEMESTER in @/lib/scope
  examPeriod: ExamPeriod;
  jurusan: Jurusan;
}

// "s2-uas-bm" — used as Realtime channel prefix, DB-indexable string,
// and localStorage key suffix.
export type ScopeKey = string;

// "s2/uas/bm" — URL path segment.
export type ScopePath = string;
