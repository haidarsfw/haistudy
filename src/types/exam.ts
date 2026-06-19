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
  question: { en: string; id: string };
}

export interface ExamQuestion {
  id: string;
  type: "essay" | "case-study";
  sectionLabel: { en: string; id: string };
  points: number;
  title: { en: string; id: string };
  /** Case study scenario text (only for case-study type). */
  context?: { en: string; id: string };
  /** Main question text (for essay type, or single-part questions). */
  question?: { en: string; id: string };
  /** Sub-questions a, b, c (only for case-study type). */
  subQuestions?: ExamSubQuestion[];
}

export interface ExamAnswerKey {
  questionId: string;
  referenceAnswer: string;
  rubric: string;
  maxPoints: number;
}

export interface ExamData {
  meta: ExamMeta;
  questions: ExamQuestion[];
  answerKeys: ExamAnswerKey[];
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
  sectionType: "essay" | "case-study";
}
