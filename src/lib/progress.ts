import type { SubjectProgress, KilatProgress } from "@/types";

const defaultProgress: SubjectProgress = {
  materi: [],
  flashcardsCompleted: false,
  quizScores: {},
};

// Progress is isolated per ACCOUNT and per SCOPE. The old single global
// "hs-progress" key leaked one user's progress into another on a shared browser
// and merged different scopes (UTS vs UAS) together. Key = account + scope.
const LEGACY_STORAGE_KEY = "hs-progress";

function storageKey(licenseKey: string, scopeKey: string): string {
  return `hs-progress::${licenseKey}::${scopeKey}`;
}

/** Read this account's progress for one scope from localStorage. */
export function getAllProgress(
  licenseKey: string,
  scopeKey: string
): Record<string, SubjectProgress> {
  if (typeof window === "undefined" || !licenseKey || !scopeKey) return {};
  try {
    const raw = localStorage.getItem(storageKey(licenseKey, scopeKey));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Write this account's progress for one scope to localStorage. */
export function saveAllProgress(
  licenseKey: string,
  scopeKey: string,
  progress: Record<string, SubjectProgress>
) {
  if (typeof window === "undefined" || !licenseKey || !scopeKey) return;
  try {
    localStorage.setItem(storageKey(licenseKey, scopeKey), JSON.stringify(progress));
  } catch {
    // ignore quota / serialization errors
  }
}

/** One-time cleanup of the pre-isolation global key (account/scope-agnostic). */
export function clearLegacyProgress() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Calculate completion percentage for a single subject. */
export function calcSubjectPercent(
  progress: SubjectProgress | undefined,
  totalMateri: number,
  hasFlashcards: boolean,
  hasQuiz: boolean,
  // Only subjects that ship a Belajar Kilat feed pass true; others are unaffected.
  hasKilat = false
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
  if (hasKilat) {
    sections++;
    if (p.kilat?.completed) completed += 1;
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

/** Merge two Kilat states - keeps the furthest progress; local wins on answers. */
function mergeKilat(
  local?: KilatProgress,
  server?: KilatProgress
): KilatProgress | undefined {
  if (!local && !server) return undefined;
  if (!local) return server;
  if (!server) return local;
  return {
    reached: Math.max(local.reached ?? 0, server.reached ?? 0),
    points: Math.max(local.points ?? 0, server.points ?? 0),
    answered: { ...server.answered, ...local.answered },
    skipped: Array.from(new Set([...(local.skipped ?? []), ...(server.skipped ?? [])])),
    chaptersDone: Array.from(
      new Set([...(local.chaptersDone ?? []), ...(server.chaptersDone ?? [])])
    ),
    completed: local.completed || server.completed,
  };
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
      kilat: mergeKilat(localSub.kilat, serverSub.kilat),
    };
  }

  return merged;
}
