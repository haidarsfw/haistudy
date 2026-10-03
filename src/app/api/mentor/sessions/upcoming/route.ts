import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { loadGroupsForAccount } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, toGroupSession, type GroupSession } from "@/lib/mentor/sessions";
import { displayNamesForAccounts } from "@/lib/mentor/names";

/**
 * GET /api/mentor/sessions/upcoming — the caller's scheduled sessions, and
 * booked 1-on-1 slots, that start within the next 24 hours (or started under
 * an hour ago and are still running), across every group they are in. Feeds the in-app reminder banner;
 * there is no push and no cron behind it, it is read when the app opens.
 *
 * scope-exempt: across the caller's groups, whatever period they teach.
 */
export async function GET() {
  try {
    if (!isSupabaseServerConfigured) return NextResponse.json({ sessions: [] });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) return NextResponse.json({ sessions: [] });

    const { mentoring, joined } = await loadGroupsForAccount(supabase, accountId);
    const groups = [...mentoring, ...joined];
    if (!groups.length) return NextResponse.json({ sessions: [] });

    const now = Date.now();
    const from = new Date(now - 3600_000).toISOString();
    const to = new Date(now + 24 * 3600_000).toISOString();
    const ids = groups.map((g) => g.id);
    const [{ data, error }, { data: slotRows }] = await Promise.all([
      supabase
        .from("group_sessions")
        .select(SESSION_COLUMNS)
        .in("group_id", ids)
        .eq("status", "scheduled")
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true })
        .limit(5),
      // Booked 1-on-1s ride the same banner: the member's own booking, and
      // for a mentor every booked slot of theirs.
      supabase
        .from("group_slots")
        .select("id, group_id, mentor_account_id, booked_by, starts_at, duration_minutes, place, booked_at")
        .in("group_id", ids)
        .eq("status", "booked")
        .or(`booked_by.eq.${accountId},mentor_account_id.eq.${accountId}`)
        .gte("starts_at", from)
        .lte("starts_at", to)
        .limit(5),
    ]);
    if (error) throw error;
    const nameOf = new Map(groups.map((g) => [g.id, g.name]));
    const people = await displayNamesForAccounts(
      supabase,
      (slotRows ?? []).map((r) => (r.booked_by === accountId ? r.mentor_account_id : r.booked_by) as string)
    );
    const slots = (slotRows ?? []).map((r) => {
      const other = (r.booked_by === accountId ? r.mentor_account_id : r.booked_by) as string;
      const s: GroupSession = {
        id: r.id as string,
        groupId: r.group_id as string,
        title: r.booked_by === accountId ? `1-on-1 dengan ${people.get(other) ?? "mentor"}` : `1-on-1: ${people.get(other) ?? "anggota"}`,
        startsAt: r.starts_at as string,
        durationMinutes: r.duration_minutes as number,
        place: (r.place as string | null) ?? null,
        agenda: [],
        notes: null,
        status: "scheduled",
        createdAt: (r.booked_at as string | null) ?? (r.starts_at as string),
        seriesId: null,
        prep: null,
      };
      return s;
    });
    const all = [...(data ?? []).map((r) => toGroupSession(r as Record<string, unknown>)), ...slots]
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 5);
    return NextResponse.json({
      sessions: all.map((s) => ({ ...s, groupName: nameOf.get(s.groupId) ?? "" })),
    });
  } catch (error) {
    console.error("[sessions/upcoming] gagal:", error);
    return NextResponse.json({ sessions: [] });
  }
}
