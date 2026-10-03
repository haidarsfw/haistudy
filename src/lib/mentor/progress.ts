import type { SupabaseClient } from "@supabase/supabase-js";

import { calcOverallProgress, calcSubjectPercent } from "@/lib/progress";
import { loadContent, loadCourses } from "@/data";
import { scopeKey } from "@/lib/scope";
import type { SubjectContent, SubjectProgress } from "@/types";
import type { MentorGroup } from "./groups";
import { displayNamesForAccounts } from "./names";

export interface MemberProgress {
  accountId: string;
  name: string;
  /** Holds a licence for the period the group teaches. */
  hasAccess: boolean;
  overall: number;
  subjects: { id: string; name: string; percent: number }[];
  exam: { attempts: number; avgScore: number | null };
  /** Modules they marked "mau dibahas" in this period. */
  wants: number;
}

/**
 * How far each of these people is in the period the group teaches: overall
 * and per subject, the same numbers their own dashboard shows them (same
 * functions, same synced progress), plus Latihan Soal attempts and how many
 * modules they asked to cover. Shared by "Progres anggota" and the program
 * report, so the two can never disagree.
 */
export async function memberProgress(
  supabase: SupabaseClient,
  group: MentorGroup,
  ids: string[]
): Promise<MemberProgress[]> {
  if (!ids.length) return [];
  const sk = scopeKey(group.scope);
  // The licences each member holds FOR THIS PERIOD: progress is stored per
  // licence, under the period's key.
  const { data: lics } = await supabase
    .from("license_keys")
    .select("key, account_id")
    .in("account_id", ids)
    .eq("semester", group.scope.semester)
    .eq("exam_period", group.scope.examPeriod)
    .eq("jurusan", group.scope.jurusan);
  const keysOf = new Map<string, string[]>();
  for (const l of lics ?? []) {
    const a = l.account_id as string;
    keysOf.set(a, [...(keysOf.get(a) ?? []), l.key as string]);
  }
  const allKeys = (lics ?? []).map((l) => l.key as string);

  const [{ data: settings }, { data: attempts }, { data: wants }, names, courses, contentAll] = await Promise.all([
    allKeys.length
      ? supabase.from("user_settings").select("license_key, progress").in("license_key", allKeys)
      : Promise.resolve({ data: [] as { license_key: string; progress: unknown }[] }),
    allKeys.length
      ? supabase
          .from("exam_attempts")
          .select("license_key, score_pct, status")
          .in("license_key", allKeys)
          .eq("scope_key", sk)
          .neq("status", "abandoned")
      : Promise.resolve({ data: [] as { license_key: string; score_pct: number | null; status: string }[] }),
    supabase
      .from("module_marks")
      .select("account_id")
      .in("account_id", ids)
      .eq("status", "want")
      .eq("semester", group.scope.semester)
      .eq("exam_period", group.scope.examPeriod)
      .eq("jurusan", group.scope.jurusan),
    displayNamesForAccounts(supabase, ids),
    loadCourses(group.scope).catch(() => []),
    loadContent(group.scope).catch(() => null),
  ]);
  const contentMap = (contentAll ?? {}) as Record<string, SubjectContent>;

  return ids.map((acc) => {
    const keys = keysOf.get(acc) ?? [];
    // Several licences for one period (rare): take the most advanced copy
    // per subject rather than mixing them.
    const merged: Record<string, SubjectProgress> = {};
    for (const k of keys) {
      const row = (settings ?? []).find((s) => s.license_key === k);
      const byScope = ((row?.progress as Record<string, Record<string, SubjectProgress>>) ?? {})[sk] ?? {};
      for (const [sid, p] of Object.entries(byScope)) {
        const prevLen = merged[sid]?.materi?.length ?? -1;
        if ((p?.materi?.length ?? 0) > prevLen) merged[sid] = p;
      }
    }
    const subjects = courses
      .filter((c) => contentMap[c.id])
      .map((c) => {
        const ct = contentMap[c.id];
        return {
          id: c.id,
          name: c.name,
          percent: calcSubjectPercent(merged[c.id], ct.materi.length, ct.flashcards.length > 0, ct.quiz.length > 0),
        };
      });
    const mine = (attempts ?? []).filter((a) => keys.includes(a.license_key as string));
    const scored = mine.filter((a) => typeof a.score_pct === "number");
    return {
      accountId: acc,
      name: names.get(acc) ?? "Pengguna",
      hasAccess: keys.length > 0,
      overall: calcOverallProgress(merged, courses, contentMap),
      subjects,
      exam: {
        attempts: mine.length,
        avgScore: scored.length
          ? Math.round(scored.reduce((s, a) => s + Number(a.score_pct), 0) / scored.length)
          : null,
      },
      wants: (wants ?? []).filter((w) => w.account_id === acc).length,
    };
  });
}
