import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { GROUP_COLUMNS, roleInGroup, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { memberProgress } from "@/lib/mentor/progress";
import { scopeKey } from "@/lib/scope";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET — how far each member is in the period the group teaches (see
 * memberProgress). Mentors only.
 *
 * scope-exempt: the group's own period, read from the group row.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ members: [] });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (role !== "mentor") return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const { data: g } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).single();
    const group = toMentorGroup(g as GroupRow);
    const sk = scopeKey(group.scope);

    const { data: members } = await supabase
      .from("group_members")
      .select("account_id")
      .eq("group_id", id)
      .eq("status", "active")
      .eq("role", "member");
    const ids = (members ?? []).map((m) => m.account_id as string);
    if (!ids.length) return NextResponse.json({ members: [], scopeKey: sk });

    const out = await memberProgress(supabase, group, ids);
    out.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return NextResponse.json({ members: out, scopeKey: sk });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/progress] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
