// ============================================
// Data manifest - scope-aware content loaders
// ============================================
// Per-scope loaders use a static key map so Turbopack/webpack can tree-shake
// per-scope chunks at build time (template-string dynamic imports often
// defeat code-splitting heuristics).
//
// AVAILABLE_SCOPES drives:
//   - Landing scope-picker tile rendering
//   - (scoped) layout 404 check
//   - Admin "All periods" enumeration
// When you add a scope, also seed scope_feature_flags rows.

import type { ScopeTuple, ScopeKey } from "@/types/scope";
import type { Subject, SubjectContent, Schedule, ForumThread } from "@/types";
import { scopeKey } from "@/lib/scope";

// Authoritative - must match AVAILABLE_SCOPES in src/lib/scope.ts.
export const AVAILABLE_SCOPES: ScopeTuple[] = [
  { semester: 1, examPeriod: "uts", jurusan: "bm" },
  { semester: 1, examPeriod: "uas", jurusan: "bm" },
  { semester: 2, examPeriod: "uts", jurusan: "bm" },
  { semester: 2, examPeriod: "uas", jurusan: "bm" },
];

interface ScopeLoaders {
  courses: () => Promise<Subject[]>;
  content: () => Promise<Record<string, SubjectContent>>;
  schedule: () => Promise<{ weekly: Schedule[]; exam: Schedule[] }>;
  rangkuman: () => Promise<Record<string, Record<string, string>>>;
  pinnedThreads: () => Promise<Record<string, ForumThread[]>>;
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

export async function loadSubjectById(s: ScopeTuple, id: string): Promise<Subject | undefined> {
  const list = await loadCourses(s);
  return list.find((c) => c.id === id);
}
