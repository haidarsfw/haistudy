"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Subject, SubjectContent, Schedule } from "@/types";
import { useScope, useOptionalScope } from "@/components/providers/scope-provider";
import { loadCourses, loadContent, loadSchedule } from "@/data";

interface ScopedDataValue {
  subjects: Subject[];
  content: Record<string, SubjectContent>;
  weeklySchedule: Schedule[];
  examSchedule: Schedule[];
  loaded: boolean;
}

const EMPTY: ScopedDataValue = {
  subjects: [],
  content: {},
  weeklySchedule: [],
  examSchedule: [],
  loaded: false,
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
    ]).then(([subjects, content, sched]) => {
      if (cancelled) return;
      setValue({
        subjects,
        content,
        weeklySchedule: sched.weekly,
        examSchedule: sched.exam,
        loaded: true,
      });
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
 * landing pages, admin shell), returns the EMPTY shape — components should
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
