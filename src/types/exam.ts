// ============================================
// Latihan Soal (Practice Exam) — Type Definitions
// ============================================

// --- Static exam data (from PDF, bilingual) ---

export interface ExamMeta {
  subjectId: string;
  examId: string;
  title: { en: string; id: string };
  academicYear: string;
  semester: string;
  examType: string;
  program: string;
  courseName: string;
  date: string;
  time: string;
  durationMinutes: number;
  totalScore: number;
  formatDescription: { en: string; id: string };
  instructions: { en: string; id: string };
  banner: { en: string; id: string };
}

export interface ExamSubQuestion {
  id: string;
  points: number;
  /**
   * Prompt text. For `true-false` parents this holds the statement to judge.
   * Text may contain Markdown (GFM tables) + KaTeX (`$$...$$`); literal money
   * like `$40,000` / `Rp200.000.000` is safe (single-dollar math is disabled
   * in ExamMarkdown).
   */
  question: { en: string; id: string };
}

export interface ExamQuestion {
  id: string;
  /**
   * Drives the answer widget + layout:
   * - `essay`      single prompt (or multi-part via subQuestions), textarea(s)
   * - `case-study` shared scenario (context) + sub-questions, one box per sub
   * - `true-false` a group of statements (subQuestions), each rendered as a
   *                True/False toggle + reasoning textarea
   *
   * Unified rule: when `subQuestions` is present, render ONE answer box per sub
   * (each sub maps to its own ExamAnswerKey by sub.id). When absent, render a
   * single box keyed by question.id.
   */
  type: "essay" | "case-study" | "true-false";
  sectionLabel: { en: string; id: string };
  points: number;
  title: { en: string; id: string };
  /**
   * Shared scenario / data block. Rendered as a "Scenario" box for case-study,
   * a lead paragraph for essay, and the section intro for true-false. Markdown +
   * KaTeX supported.
   */
  context?: { en: string; id: string };
  /** Main question text (single-part essay). Markdown + KaTeX supported. */
  question?: { en: string; id: string };
  /** Sub-questions / statements. Each maps to an ExamAnswerKey by its id. */
  subQuestions?: ExamSubQuestion[];
}

export interface ExamAnswerKey {
  questionId: string;
  referenceAnswer: string;
  rubric: string;
  maxPoints: number;
}

/** One flip-through "sheet" of a course cheat sheet (Markdown + KaTeX). */
export interface CheatSheetSheet {
  /** Short tab/heading label (e.g. "Location Strategies"). */
  title: string;
  /** Sheet body as Markdown + KaTeX. Single-language (matches source PDF). */
  contentMd: string;
}

/** Optional in-exam reference, e.g. the Operations Management cheat sheet. */
export interface CheatSheet {
  /** Cleaned-up web view (Markdown + KaTeX), one entry per sheet. */
  sheets: CheatSheetSheet[];
  /**
   * Optional "original PDF" view: pre-rendered PNG of each sheet (public paths,
   * e.g. "/cheatsheets/opsmgmt/sheet-1.png"). When present the viewer offers a
   * Web ⇄ PDF toggle. Order = sheet order.
   */
  imageSheets?: string[];
}

export interface ExamData {
  meta: ExamMeta;
  questions: ExamQuestion[];
  answerKeys: ExamAnswerKey[];
  /** Present only for courses that allow an in-exam cheat sheet (Ops Mgmt). */
  cheatSheet?: CheatSheet;
  /** When true, a scientific calculator is offered in the exam (Accounting, Ops Mgmt). */
  calculator?: boolean;
}

// --- Runtime types (user session & grading) ---

export interface UserExamAnswer {
  questionId: string;
  answer: string;
  answeredAt: string;
}

export interface ExamGradingResult {
  questionId: string;
  score: number;
  maxPoints: number;
  feedback: string;
  keyPointsMatched: string[];
  keyPointsMissed: string[];
}

export interface ExamAttempt {
  id: string;
  licenseKey: string;
  scopeKey: string;
  subjectId: string;
  examId: string;
  answers: UserExamAnswer[];
  gradingResults: ExamGradingResult[];
  totalScore: number;
  maxScore: number;
  scorePct: number;
  startedAt: string;
  submittedAt: string | null;
  durationUsedSeconds: number | null;
  examLanguage: "en" | "id";
  autoSubmitted: boolean;
  status: "in_progress" | "submitted" | "graded" | "abandoned";
  createdAt: string;
}

export interface ExamQuota {
  subjectId: string;
  used: number;
  max: number;
  remaining: number;
}

export interface ExamSessionState {
  attemptId: string;
  examId: string;
  subjectId: string;
  startedAt: string;
  durationMinutes: number;
  answers: Record<string, string>;
  currentQuestionIndex: number;
  examLanguage: "en" | "id";
  gracePeriodActive: boolean;
}

/**
 * Flattened list of all answerable items (essays + case-study sub-questions).
 * Used by the exam player for navigation and progress tracking.
 */
export interface ExamAnswerSlot {
  questionId: string;
  parentId?: string;
  label: string;
  points: number;
  sectionType: "essay" | "case-study" | "true-false";
  /** Short section heading for the nav panel grouping (localized). */
  section: string;
}
