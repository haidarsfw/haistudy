"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Subject, SubjectContent, Schedule, SubjectKilat } from "@/types";
import type { ExamData } from "@/types/exam";
import { useScope, useOptionalScope } from "@/components/providers/scope-provider";
import { loadCourses, loadContent, loadSchedule, loadRangkuman, loadKilat, loadExamData } from "@/data";
import { isChunkLoadError, recoverFromChunkError, markAppHealthy } from "@/lib/chunk-recovery";
import { logError } from "@/lib/error-logging";

interface ScopedDataValue {
  subjects: Subject[];
  content: Record<string, SubjectContent>;
  weeklySchedule: Schedule[];
  examSchedule: Schedule[];
  loaded: boolean;
  /** subjectId -> { moduleTitle: html }. Used for tab visibility (empty = hide). */
  rangkuman: Record<string, Record<string, string>>;
  rangkumanLoaded: boolean;
  /** subjectId -> Belajar Kilat feed. Used for tab visibility + the player. */
  kilat: Record<string, SubjectKilat>;
  kilatLoaded: boolean;
  /** subjectId -> Exam data. Used for tab visibility + the exam player. */
  examData: Record<string, ExamData>;
  examDataLoaded: boolean;
}

const EMPTY: ScopedDataValue = {
  subjects: [],
  content: {},
  weeklySchedule: [],
  examSchedule: [],
  loaded: false,
  rangkuman: {},
  rangkumanLoaded: false,
  kilat: {},
  kilatLoaded: false,
  examData: {},
  examDataLoaded: false,
};

const ScopedDataContext = createContext<ScopedDataValue>(EMPTY);

/**
 * Mount under ScopeProvider. Pre-loads the current scope's courses,
 * content, and schedule once per scope change. Widgets consume via
 * useScopedData() and stay synchronous.
 */
export function ScopedDataProvider({ children }: { children: React.ReactNode }) {
  const { scope } = useScope();
  const [value, setValue] = useState<ScopedDataValue>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    setValue(EMPTY);
    Promise.all([
      loadCourses(scope),
      loadContent(scope) as Promise<Record<string, SubjectContent>>,
      loadSchedule(scope),
    ])
      .then(([subjects, content, sched]) => {
        if (cancelled) return;
        // Critical scoped data loaded → reset the once-per-session chunk guard.
        markAppHealthy();
        setValue((v) => ({
          ...v,
          subjects,
          content,
          weeklySchedule: sched.weekly,
          examSchedule: sched.exam,
          loaded: true,
        }));
      })
      .catch((e) => {
        if (cancelled) return;
        // Stale-deploy chunk failure → auto-reload once, then prompt (no loop).
        if (isChunkLoadError(e)) return recoverFromChunkError();
        // Genuine load failure → log (now visible; handlers are wired) and leave
        // `loaded` false so the page shows its spinner instead of a dead crash.
        logError("scoped-data load failed", e instanceof Error ? e.stack : String(e));
      });
    // Rangkuman loads separately so it never blocks dashboard readiness
    // (`loaded`). Functional updates keep both results regardless of order.
    (loadRangkuman(scope) as Promise<Record<string, Record<string, string>>>)
      .then((rangkuman) => {
        if (cancelled) return;
        setValue((v) => ({ ...v, rangkuman, rangkumanLoaded: true }));
      })
      .catch((e) => {
        if (isChunkLoadError(e)) recoverFromChunkError();
      });
    // Belajar Kilat feed - same non-blocking pattern. Resolves to {} for scopes
    // without a feed registered (loader is optional).
    (loadKilat(scope) as Promise<Record<string, SubjectKilat>>)
      .then((kilat) => {
        if (cancelled) return;
        setValue((v) => ({ ...v, kilat, kilatLoaded: true }));
      })
      .catch((e) => {
        if (isChunkLoadError(e)) recoverFromChunkError();
      });
    // Exam data - same non-blocking pattern. Resolves to {} for scopes
    // without exam data registered (loader is optional).
    (loadExamData(scope) as Promise<Record<string, ExamData>>)
      .then((examData) => {
        if (cancelled) return;
        setValue((v) => ({ ...v, examData, examDataLoaded: true }));
      })
      .catch((e) => {
        if (isChunkLoadError(e)) recoverFromChunkError();
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  return (
    <ScopedDataContext.Provider value={value}>
      {children}
    </ScopedDataContext.Provider>
  );
}

/**
 * Returns the active scope's content. When outside the scoped tree (e.g.,
 * landing pages, admin shell), returns the EMPTY shape - components should
 * fall back to the legacy `@/data/subjects` shim or skip rendering.
 */
export function useScopedData(): ScopedDataValue {
  return useContext(ScopedDataContext);
}

/**
 * Convenience: get a single subject by id, scope-aware.
 */
export function useScopedSubjectById(id: string | null): Subject | undefined {
  const { subjects } = useScopedData();
  if (!id) return undefined;
  return subjects.find((s) => s.id === id);
}

/**
 * Convenience: get content for a single subject, scope-aware.
 */
export function useScopedSubjectContent(id: string | null): SubjectContent | undefined {
  const { content } = useScopedData();
  if (!id) return undefined;
  return content[id];
}

export function useOptionalScopedData(): ScopedDataValue | null {
  const scopeCtx = useOptionalScope();
  const data = useContext(ScopedDataContext);
  if (!scopeCtx) return null;
  return data;
}
