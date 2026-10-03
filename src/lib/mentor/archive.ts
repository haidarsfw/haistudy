import type { SupabaseClient } from "@supabase/supabase-js";

import { loadSchedule } from "@/data";
import { GROUP_COLUMNS, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import type { ScopeTuple } from "@/types/scope";

/** Days after a period's last exam before its groups are archived (owner, 4 Oct 2026). */
export const ARCHIVE_AFTER_DAYS = 14;

/**
 * Archive every running group whose period ended: its last exam (from the
 * period's exam schedule) was at least ARCHIVE_AFTER_DAYS ago. Runs from the
 * daily cleanup cron, so no cron slot of its own.
 *
 * Two guards, both from the data as it really is:
 *   - a period with no exam dates (S1 today) is skipped, never guessed;
 *   - a group created AFTER the period's last exam is skipped: the schedule
 *     is last year's, or the group is for the next cohort. Without this, a
 *     group made today for a period whose file still holds last year's dates
 *     would be archived the night it was made.
 *
 * Returns the ids it archived.
 */
/** The period's last exam (epoch ms) from its exam schedule, or null when it has none. */
async function lastExamFromSchedule(scope: ScopeTuple): Promise<number | null> {
  const schedule = await loadSchedule(scope).catch(() => null);
  const dates = (schedule?.exam ?? [])
    .map((e) => (e.examDate ? Date.parse(e.examDate) : NaN))
    .filter((t) => Number.isFinite(t));
  return dates.length ? Math.max(...dates) : null;
}

export async function archiveEndedGroups(
  supabase: SupabaseClient,
  now = Date.now(),
  lastExamFor: (scope: ScopeTuple) => Promise<number | null> = lastExamFromSchedule
): Promise<string[]> {
  const { data } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("status", "active");
  const lastExamOf = new Map<string, number | null>();
  const archived: string[] = [];

  for (const row of (data ?? []) as GroupRow[]) {
    const g = toMentorGroup(row);
    let last = lastExamOf.get(g.scopeKey);
    if (last === undefined) {
      last = await lastExamFor(g.scope);
      lastExamOf.set(g.scopeKey, last);
    }
    if (last === null) continue;
    if (Date.parse(g.createdAt) >= last) continue;
    if (now < last + ARCHIVE_AFTER_DAYS * 86400_000) continue;

    const { error } = await supabase
      .from("mentor_groups")
      .update({ status: "archived", updated_at: new Date(now).toISOString() })
      .eq("id", g.id)
      .eq("status", "active");
    if (error) console.error("[archive] grup gagal diarsipkan:", g.id, error.message);
    else archived.push(g.id);
  }
  return archived;
}
