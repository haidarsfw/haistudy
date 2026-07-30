// ============================================
// Data manifest - scope-aware content loaders
// ============================================
// Per-scope loaders use a static key map so Turbopack/webpack can tree-shake
// per-scope chunks at build time (template-string dynamic imports often
// defeat code-splitting heuristics).
//
// AVAILABLE_SCOPES drives:
//   - (scoped) layout 404 check
//   - Admin scope switcher + "All periods" enumeration
//   - The period picker in /payments (sellable ones are PURCHASABLE_SCOPES)
// A period is declared once, in SCOPE_REGISTRY in @/lib/scope. Adding one also
// means: a folder here, a loaders entry below, and scope_feature_flags rows.

import type { ScopeTuple, ScopeKey } from "@/types/scope";
import type { Subject, SubjectContent, Schedule, ForumThread, SubjectKilat } from "@/types";
import type { ExamData } from "@/types/exam";
import { scopeKey, AVAILABLE_SCOPES } from "@/lib/scope";

// Re-exported, never re-declared. This used to be a second hand-kept copy of
// the same list with a comment asking the next person to remember; two lists
// that must agree eventually disagree.
export { AVAILABLE_SCOPES };

interface ScopeLoaders {
  courses: () => Promise<Subject[]>;
  content: () => Promise<Record<string, SubjectContent>>;
  schedule: () => Promise<{ weekly: Schedule[]; exam: Schedule[] }>;
  rangkuman: () => Promise<Record<string, Record<string, string>>>;
  pinnedThreads: () => Promise<Record<string, ForumThread[]>>;
  // Optional - only scopes that have authored a Belajar Kilat feed register this.
  kilat?: () => Promise<Record<string, SubjectKilat>>;
  // Optional - only scopes that have authored exam data register this.
  examData?: () => Promise<Record<string, ExamData>>;
}

const loaders: Record<ScopeKey, ScopeLoaders> = {
  "s1-uts-bm": {
    courses:   () => import("./s1/uts/bm/courses").then((m) => m.courses),
    content:   () => import("./s1/uts/bm/content").then((m) => m.content),
    schedule:  () => import("./s1/uts/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s1/uts/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s1/uts/bm/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s1-uas-bm": {
    courses:   () => import("./s1/uas/bm/courses").then((m) => m.courses),
    content:   () => import("./s1/uas/bm/content").then((m) => m.content),
    schedule:  () => import("./s1/uas/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s1/uas/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s1/uas/bm/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s2-uts-bm": {
    courses:   () => import("./s2/uts/bm/courses").then((m) => m.courses),
    content:   () => import("./s2/uts/bm/content").then((m) => m.content),
    schedule:  () => import("./s2/uts/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s2/uts/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s2/uts/bm/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s2-uas-bm": {
    courses:   () => import("./s2/uas/bm/courses").then((m) => m.courses),
    content:   () => import("./s2/uas/bm/content").then((m) => m.content),
    schedule:  () => import("./s2/uas/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s2/uas/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s2/uas/bm/pinned-threads").then((m) => m.PINNED_THREADS),
    kilat:     () => import("./s2/uas/bm/kilat").then((m) => m.kilat),
    examData:  () => import("./s2/uas/bm/exam-data").then((m) => m.examData),
  },
  // ─── Registered but empty ───
  // Every file exists so a period is one content edit away from being real, and
  // so nothing here can throw "No content loader registered". `kilat` and
  // `examData` stay unregistered on purpose: the loaders return {} when absent,
  // which is exactly what an empty period should answer.
  "s3-uts-bm": {
    courses:   () => import("./s3/uts/bm/courses").then((m) => m.courses),
    content:   () => import("./s3/uts/bm/content").then((m) => m.content),
    schedule:  () => import("./s3/uts/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s3/uts/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s3/uts/bm/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s3-uas-bm": {
    courses:   () => import("./s3/uas/bm/courses").then((m) => m.courses),
    content:   () => import("./s3/uas/bm/content").then((m) => m.content),
    schedule:  () => import("./s3/uas/bm/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s3/uas/bm/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s3/uas/bm/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s1-uts-pba": {
    courses:   () => import("./s1/uts/pba/courses").then((m) => m.courses),
    content:   () => import("./s1/uts/pba/content").then((m) => m.content),
    schedule:  () => import("./s1/uts/pba/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s1/uts/pba/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s1/uts/pba/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s1-uas-pba": {
    courses:   () => import("./s1/uas/pba/courses").then((m) => m.courses),
    content:   () => import("./s1/uas/pba/content").then((m) => m.content),
    schedule:  () => import("./s1/uas/pba/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s1/uas/pba/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s1/uas/pba/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s3-uts-pba": {
    courses:   () => import("./s3/uts/pba/courses").then((m) => m.courses),
    content:   () => import("./s3/uts/pba/content").then((m) => m.content),
    schedule:  () => import("./s3/uts/pba/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s3/uts/pba/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s3/uts/pba/pinned-threads").then((m) => m.PINNED_THREADS),
  },
  "s3-uas-pba": {
    courses:   () => import("./s3/uas/pba/courses").then((m) => m.courses),
    content:   () => import("./s3/uas/pba/content").then((m) => m.content),
    schedule:  () => import("./s3/uas/pba/schedule").then((m) => ({ weekly: m.weeklySchedule, exam: m.examSchedule })),
    rangkuman: () => import("./s3/uas/pba/rangkuman").then((m) => m.rangkumanContent),
    pinnedThreads: () => import("./s3/uas/pba/pinned-threads").then((m) => m.PINNED_THREADS),
  },
};

function getLoaders(s: ScopeTuple): ScopeLoaders {
  const key = scopeKey(s);
  const l = loaders[key];
  if (!l) throw new Error(`No content loader registered for scope ${key}`);
  return l;
}

export async function loadCourses(s: ScopeTuple): Promise<Subject[]> {
  return getLoaders(s).courses();
}

export async function loadContent(
  s: ScopeTuple,
  subjectId?: string
): Promise<SubjectContent | Record<string, SubjectContent> | null> {
  const map = await getLoaders(s).content();
  if (subjectId) return map[subjectId] ?? null;
  return map;
}

export async function loadSchedule(s: ScopeTuple): Promise<{ weekly: Schedule[]; exam: Schedule[] }> {
  return getLoaders(s).schedule();
}

export async function loadRangkuman(
  s: ScopeTuple,
  subjectId?: string
): Promise<Record<string, string> | Record<string, Record<string, string>> | null> {
  const map = await getLoaders(s).rangkuman();
  if (subjectId) return map[subjectId] ?? null;
  return map;
}

export async function loadPinnedThreads(
  s: ScopeTuple,
  subjectId?: string
): Promise<ForumThread[] | Record<string, ForumThread[]>> {
  const map = await getLoaders(s).pinnedThreads();
  if (subjectId) return map[subjectId] ?? [];
  return map;
}

export async function loadKilat(
  s: ScopeTuple,
  subjectId?: string
): Promise<SubjectKilat | Record<string, SubjectKilat> | null> {
  const load = getLoaders(s).kilat;
  if (!load) return subjectId ? null : {};
  const map = await load();
  if (subjectId) return map[subjectId] ?? null;
  return map;
}

export async function loadExamData(
  s: ScopeTuple,
  subjectId?: string
): Promise<ExamData | Record<string, ExamData> | null> {
  const load = getLoaders(s).examData;
  if (!load) return subjectId ? null : {};
  const map = await load();
  if (subjectId) return map[subjectId] ?? null;
  return map;
}

export async function loadSubjectById(s: ScopeTuple, id: string): Promise<Subject | undefined> {
  const list = await loadCourses(s);
  return list.find((c) => c.id === id);
}
