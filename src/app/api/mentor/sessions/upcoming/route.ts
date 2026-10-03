import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { loadGroupsForAccount } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, toGroupSession } from "@/lib/mentor/sessions";

/**
 * GET /api/mentor/sessions/upcoming — the caller's scheduled sessions that
 * start within the next 24 hours (or started under an hour ago and are still
 * running), across every group they are in. Feeds the in-app reminder banner;
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
    const { data, error } = await supabase
      .from("group_sessions")
      .select(SESSION_COLUMNS)
      .in("group_id", groups.map((g) => g.id))
      .eq("status", "scheduled")
      .gte("starts_at", new Date(now - 3600_000).toISOString())
      .lte("starts_at", new Date(now + 24 * 3600_000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(5);
    if (error) throw error;
    const nameOf = new Map(groups.map((g) => [g.id, g.name]));
    return NextResponse.json({
      sessions: (data ?? []).map((r) => {
        const s = toGroupSession(r as Record<string, unknown>);
        return { ...s, groupName: nameOf.get(s.groupId) ?? "" };
      }),
    });
  } catch (error) {
    console.error("[sessions/upcoming] gagal:", error);
    return NextResponse.json({ sessions: [] });
  }
}
