import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, parseSessionInput, toGroupSession } from "@/lib/mentor/sessions";

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
    return NextResponse.json({
      sessions: (data ?? []).map((r) => toGroupSession(r as Record<string, unknown>)),
      role,
    });
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

    const parsed = parseSessionInput((await req.json().catch(() => ({}))) as Record<string, unknown>, false);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { data, error } = await supabase
      .from("group_sessions")
      .insert({ group_id: id, created_by: accountId, ...parsed.values })
      .select(SESSION_COLUMNS)
      .single();
    if (error) throw error;
    return NextResponse.json({ session: toGroupSession(data as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/sessions] POST gagal:", error);
    return NextResponse.json({ error: "Sesi gagal disimpan" }, { status: 500 });
  }
}
