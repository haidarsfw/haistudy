import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function context(id: string, sessionId: string) {
  if (!isSupabaseServerConfigured) return null;
  const supabase = createServerClient()!;
  const accountId = await requestingAccountId(supabase);
  if (!accountId || !UUID_RE.test(id) || !UUID_RE.test(sessionId)) return null;
  const role = await roleInGroup(supabase, id, accountId);
  if (!role) return null;
  const { data: session } = await supabase
    .from("group_sessions")
    .select("id, status, starts_at, duration_minutes")
    .eq("id", sessionId)
    .eq("group_id", id)
    .maybeSingle();
  if (!session) return null;
  return { supabase, accountId, role, session };
}

/**
 * PUT — a member answers for themselves: { rsvp: "going" | "not_going", reason? }.
 * Only while the session is still ahead and not cancelled.
 *
 * scope-exempt: a group's audience is its members, not a period.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string; sessionId: string }> }) {
  try {
    const { id, sessionId } = await ctx.params;
    const c = await context(id, sessionId);
    if (!c) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (await isGroupArchived(c.supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const ends = Date.parse(c.session.starts_at as string) + (c.session.duration_minutes as number) * 60_000;
    if (c.session.status !== "scheduled" || ends < Date.now()) {
      return NextResponse.json({ error: "Sesi ini sudah lewat atau batal." }, { status: 409 });
    }
    const body = (await req.json().catch(() => ({}))) as { rsvp?: string; reason?: string };
    if (body.rsvp !== "going" && body.rsvp !== "not_going") {
      return NextResponse.json({ error: "Pilih hadir atau tidak." }, { status: 400 });
    }
    const reason = body.rsvp === "not_going" ? String(body.reason ?? "").trim().slice(0, 200) || null : null;
    const { error } = await c.supabase.from("session_attendance").upsert(
      {
        session_id: sessionId,
        account_id: c.accountId,
        rsvp: body.rsvp,
        reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,account_id" }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true, rsvp: body.rsvp, reason });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[sessions/attendance] PUT gagal:", error);
    return NextResponse.json({ error: "Jawaban belum tersimpan" }, { status: 500 });
  }
}

/**
 * PATCH — the mentor marks who actually came: { accountId, attended: true | false | null }.
 * Only for an active member of this group.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; sessionId: string }> }) {
  try {
    const { id, sessionId } = await ctx.params;
    const c = await context(id, sessionId);
    if (!c || c.role !== "mentor") return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    if (await isGroupArchived(c.supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const body = (await req.json().catch(() => ({}))) as { accountId?: string; attended?: boolean | null };
    const target = String(body.accountId ?? "");
    if (!UUID_RE.test(target) || (body.attended !== true && body.attended !== false && body.attended !== null)) {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }
    const { data: member } = await c.supabase
      .from("group_members")
      .select("id")
      .eq("group_id", id)
      .eq("account_id", target)
      .eq("status", "active")
      .maybeSingle();
    if (!member) return NextResponse.json({ error: "Bukan anggota grup ini" }, { status: 404 });
    const { error } = await c.supabase.from("session_attendance").upsert(
      { session_id: sessionId, account_id: target, attended: body.attended, updated_at: new Date().toISOString() },
      { onConflict: "session_id,account_id" }
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[sessions/attendance] PATCH gagal:", error);
    return NextResponse.json({ error: "Kehadiran belum tersimpan" }, { status: 500 });
  }
}
