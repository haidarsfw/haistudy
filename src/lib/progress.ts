import type { SubjectProgress } from "@/types";

const defaultProgress: SubjectProgress = {
  materi: [],
  flashcardsCompleted: false,
  quizScores: {},
};

const STORAGE_KEY = "hs-progress";

/** Read all progress from localStorage. */
export function getAllProgress(): Record<string, SubjectProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Write all progress to localStorage. */
export function saveAllProgress(progress: Record<string, SubjectProgress>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

/** Calculate completion percentage for a single subject. */
export function calcSubjectPercent(
  progress: SubjectProgress | undefined,
  totalMateri: number,
  hasFlashcards: boolean,
  hasQuiz: boolean
): number {
  const p = progress || defaultProgress;
  let sections = 0;
  let completed = 0;

  if (totalMateri > 0) {
    sections++;
    completed += p.materi.length / totalMateri;
  }
  if (hasFlashcards) {
    sections++;
    if (p.flashcardsCompleted) completed += 1;
  }
  if (hasQuiz) {
    sections++;
    if (Object.keys(p.quizScores).length > 0) completed += 1;
  }

  return sections > 0 ? Math.round((completed / sections) * 100) : 0;
}

/**
 * Calculate overall progress across all subjects.
 * Accepts the subjects array and content map to avoid importing data modules.
 */
export function calcOverallProgress(
  allProgress: Record<string, SubjectProgress>,
  subjectList: { id: string }[],
  contentMap: Record<string, { materi: unknown[]; flashcards: unknown[]; quiz: unknown[] }>
): number {
  let total = 0;
  let sum = 0;

  for (const s of subjectList) {
    const c = contentMap[s.id];
    if (!c) continue;
    total++;
    const p = allProgress[s.id] || defaultProgress;
    const percent = calcSubjectPercent(
      p,
      c.materi.length,
      c.flashcards.length > 0,
      c.quiz.length > 0
    );
    sum += percent;
  }

  return total > 0 ? Math.round(sum / total) : 0;
}

/**
 * Merge server progress with local progress.
 * Union of materi IDs, logical OR for flashcards, local wins for quiz scores.
 */
export function mergeProgress(
  local: Record<string, SubjectProgress>,
  server: Record<string, SubjectProgress>
): Record<string, SubjectProgress> {
  const merged = { ...local };

  for (const [subjectId, serverSub] of Object.entries(server)) {
    const localSub = merged[subjectId] || defaultProgress;
    merged[subjectId] = {
      materi: Array.from(new Set([...localSub.materi, ...serverSub.materi])),
      flashcardsCompleted:
        localSub.flashcardsCompleted || serverSub.flashcardsCompleted,
      quizScores: {
        ...serverSub.quizScores,
        ...localSub.quizScores,
      },
    };
  }

  return merged;
}
