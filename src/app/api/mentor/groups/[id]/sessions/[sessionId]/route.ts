import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, parseSessionInput, toGroupSession } from "@/lib/mentor/sessions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH one session — mentors only: any of title, startsAt, durationMinutes,
 * place, agenda, notes, status. "Selesai" with notes is the session report;
 * "batal" keeps the row so members see it was cancelled, not that it vanished.
 *
 * scope-exempt: see the group sessions route.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id, sessionId } = await ctx.params;
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role =
      accountId && UUID_RE.test(id) && UUID_RE.test(sessionId)
        ? await roleInGroup(supabase, id, accountId)
        : null;
    if (role !== "mentor") return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });

    const parsed = parseSessionInput((await req.json().catch(() => ({}))) as Record<string, unknown>, true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (!Object.keys(parsed.values).length) {
      return NextResponse.json({ error: "Tidak ada yang diubah." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("group_sessions")
      .update({ ...parsed.values, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("group_id", id)
      .select(SESSION_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ session: toGroupSession(data as Record<string, unknown>) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/sessions/:id] PATCH gagal:", error);
    return NextResponse.json({ error: "Sesi gagal diperbarui" }, { status: 500 });
  }
}
