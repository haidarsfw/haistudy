import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, parseSessionInput, toGroupSession, type GroupSession } from "@/lib/mentor/sessions";
import { displayNamesForAccounts } from "@/lib/mentor/names";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A group's session schedule.
 *   GET  — members and mentors: every session, oldest first
 *   POST — mentors: schedule a new one
 *
 * scope-exempt: a group's audience is its members, not a period. Identity from
 * the account (or the licence's account inside the app); access from
 * roleInGroup on every call.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ sessions: [] });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (!role) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const { data, error } = await supabase
      .from("group_sessions")
      .select(SESSION_COLUMNS)
      .eq("group_id", id)
      .order("starts_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    const sessions: GroupSession[] = (data ?? []).map((r) => toGroupSession(r as Record<string, unknown>));

    // Attendance rides along: a member sees their own answer, a mentor sees
    // every member's, so neither needs a second request per session.
    if (sessions.length) {
      const { data: att } = await supabase
        .from("session_attendance")
        .select("session_id, account_id, rsvp, reason, attended")
        .in("session_id", sessions.map((s) => s.id));
      const rows = att ?? [];
      if (role === "mentor") {
        const { data: members } = await supabase
          .from("group_members")
          .select("account_id")
          .eq("group_id", id)
          .eq("status", "active")
          .eq("role", "member");
        const memberIds = (members ?? []).map((m) => m.account_id as string);
        const names = await displayNamesForAccounts(supabase, memberIds);
        for (const s of sessions) {
          s.attendance = memberIds.map((acc) => {
            const r = rows.find((x) => x.session_id === s.id && x.account_id === acc);
            return {
              accountId: acc,
              name: names.get(acc) ?? "Pengguna",
              rsvp: (r?.rsvp as "going" | "not_going" | null) ?? null,
              reason: (r?.reason as string | null) ?? null,
              attended: (r?.attended as boolean | null) ?? null,
            };
          });
        }
      } else {
        for (const s of sessions) {
          const r = rows.find((x) => x.session_id === s.id && x.account_id === accountId);
          s.myRsvp = r
            ? { rsvp: (r.rsvp as "going" | "not_going" | null) ?? null, reason: (r.reason as string | null) ?? null }
            : null;
        }
      }
    }
    return NextResponse.json({ sessions, role });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/sessions] GET gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (role !== "mentor") return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const { data: group } = await supabase.from("mentor_groups").select("status").eq("id", id).maybeSingle();
    if (group?.status !== "active") {
      return NextResponse.json({ error: "Grup ini sudah diarsipkan." }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseSessionInput(body, false);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    // A weekly series: the same session N weeks running, one row each, tied
    // by series_id so they can be cancelled together. Twelve weeks covers a
    // semester; anything more is a typo.
    const weeks = Math.min(12, Math.max(1, Math.round(Number(body.repeatWeeks ?? 1)) || 1));
    const seriesId = weeks > 1 ? crypto.randomUUID() : null;
    const start = Date.parse(parsed.values.starts_at as string);
    const rows = Array.from({ length: weeks }, (_, i) => ({
      group_id: id,
      created_by: accountId,
      ...parsed.values,
      starts_at: new Date(start + i * 7 * 24 * 3600_000).toISOString(),
      series_id: seriesId,
    }));

    const { data, error } = await supabase.from("group_sessions").insert(rows).select(SESSION_COLUMNS);
    if (error) throw error;
    const sessions = (data ?? []).map((r) => toGroupSession(r as Record<string, unknown>));
    return NextResponse.json({ session: sessions[0], sessions });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/sessions] POST gagal:", error);
    return NextResponse.json({ error: "Sesi gagal disimpan" }, { status: 500 });
  }
}
