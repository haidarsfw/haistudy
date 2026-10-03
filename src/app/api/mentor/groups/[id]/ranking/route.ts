import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { GROUP_COLUMNS, ARCHIVED_ERROR, isGroupArchived, roleInGroup, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { memberProgress } from "@/lib/mentor/progress";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOP = 10;

/**
 * The group's ranking, as the owner decided (4 Oct 2026): the top 10 and
 * where you stand, by overall progress, the same number the dashboard
 * shows; a tie goes to more Latihan Soal attempts.
 *
 *   GET    { top: [{ rank, name, overall, isYou, hidden }], me, total }
 *   PATCH  { hidden: boolean } — keep your own name out of it ("Anggota")
 *
 * Names a member chose to hide read "Anggota" for the other members; the
 * mentor still sees them (they see everyone's progress anyway), marked.
 *
 * scope-exempt: the group's own period, read from the group row. Identity
 * from the account (or the licence's account); access from roleInGroup.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ top: [], me: null, total: 0 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (!role) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const [{ data: g }, { data: rows }] = await Promise.all([
      supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).single(),
      supabase
        .from("group_members")
        .select("account_id, rank_hidden")
        .eq("group_id", id)
        .eq("status", "active")
        .eq("role", "member"),
    ]);
    const group = toMentorGroup(g as GroupRow);
    const hiddenOf = new Map((rows ?? []).map((r) => [r.account_id as string, Boolean(r.rank_hidden)]));
    const progress = await memberProgress(supabase, group, [...hiddenOf.keys()]);
    const ranked = progress
      .slice()
      .sort(
        (a, b) =>
          b.overall - a.overall || b.exam.attempts - a.exam.attempts || a.name.localeCompare(b.name, "id")
      )
      .map((p, i) => ({ ...p, rank: i + 1, hidden: hiddenOf.get(p.accountId) ?? false }));

    const shown = (p: (typeof ranked)[number]) => {
      const isYou = p.accountId === accountId;
      return {
        rank: p.rank,
        name: p.hidden && !isYou && role !== "mentor" ? "Anggota" : p.name,
        overall: p.overall,
        isYou,
        hidden: p.hidden,
      };
    };
    const mine = ranked.find((p) => p.accountId === accountId);
    return NextResponse.json({
      top: ranked.slice(0, TOP).map(shown),
      me: mine ? { rank: mine.rank, overall: mine.overall, hidden: mine.hidden } : null,
      total: ranked.length,
      role,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/ranking] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (role !== "member") return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const body = (await req.json().catch(() => ({}))) as { hidden?: unknown };
    if (typeof body.hidden !== "boolean") {
      return NextResponse.json({ error: "hidden wajib true/false" }, { status: 400 });
    }
    const { error } = await supabase
      .from("group_members")
      .update({ rank_hidden: body.hidden })
      .eq("group_id", id)
      .eq("account_id", accountId!);
    if (error) throw error;
    return NextResponse.json({ ok: true, hidden: body.hidden });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/ranking] PATCH gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
