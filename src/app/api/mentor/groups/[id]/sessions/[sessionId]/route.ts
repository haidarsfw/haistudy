import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { SESSION_COLUMNS, parseSessionInput, toGroupSession } from "@/lib/mentor/sessions";
import { notify } from "@/lib/mentor/requests";
import { waitUntil } from "@vercel/functions";

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

    // Read before writing: the summary goes out on the FIRST close only, so
    // fixing a typo in the notes later does not ping everyone again.
    const { data: before } = await supabase
      .from("group_sessions")
      .select("status")
      .eq("id", sessionId)
      .eq("group_id", id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("group_sessions")
      .update({ ...parsed.values, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("group_id", id)
      .select(SESSION_COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Sesi tidak ditemukan" }, { status: 404 });
    const session = toGroupSession(data as Record<string, unknown>);

    // "Ringkasan sesi otomatis ke yang absen": everyone the mentor did not
    // mark as present gets the notes in their inbox. Off the critical path.
    if (before?.status !== "done" && session.status === "done" && session.notes) {
      waitUntil(
        (async () => {
          const [{ data: members }, { data: present }, { data: group }] = await Promise.all([
            supabase.from("group_members").select("account_id").eq("group_id", id).eq("status", "active").eq("role", "member"),
            supabase.from("session_attendance").select("account_id").eq("session_id", sessionId).eq("attended", true),
            supabase.from("mentor_groups").select("id, name").eq("id", id).single(),
          ]);
          const came = new Set((present ?? []).map((r) => r.account_id as string));
          const preview = `${session.title}: ${session.notes}`.slice(0, 280);
          for (const m of members ?? []) {
            const acc = m.account_id as string;
            if (came.has(acc)) continue;
            await notify(supabase, acc, { id, name: (group?.name as string) ?? "Grup" }, "session_summary", null, preview);
          }
        })().catch((e) => console.error("[sessions] ringkasan gagal dikirim:", e))
      );
    }
    return NextResponse.json({ session });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/sessions/:id] PATCH gagal:", error);
    return NextResponse.json({ error: "Sesi gagal diperbarui" }, { status: 500 });
  }
}
