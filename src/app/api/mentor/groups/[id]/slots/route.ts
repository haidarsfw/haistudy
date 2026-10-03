import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import { SLOT_BATCH_MAX, SLOT_COLUMNS, type GroupSlot, type SlotStatus } from "@/lib/mentor/slots";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 1-on-1 slots of one group.
 *
 *   GET   the mentor: every slot from a week back, with who booked and why;
 *         a member: open upcoming slots, and their own bookings. Who booked
 *         the others is not theirs to read, so those read only "terisi".
 *   POST  (mentor) { startsAt, durationMinutes, count, place } — open
 *         `count` back-to-back slots.
 *
 * scope-exempt: the group's audience is its members, not a period.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ slots: [] });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (!role) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const since = new Date(Date.now() - (role === "mentor" ? 7 * 86400_000 : 0)).toISOString();
    const { data, error } = await supabase
      .from("group_slots")
      .select(SLOT_COLUMNS)
      .eq("group_id", id)
      .gte("starts_at", since)
      .order("starts_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    const rows = data ?? [];
    const names =
      role === "mentor"
        ? await displayNamesForAccounts(
            supabase,
            rows.map((r) => r.booked_by as string | null).filter((x): x is string => Boolean(x))
          )
        : new Map<string, string>();

    const slots: GroupSlot[] = rows
      .filter((r) => role === "mentor" || r.status !== "cancelled" || r.booked_by === accountId)
      .map((r) => {
        const mine = r.booked_by === accountId;
        const seeWho = role === "mentor" || mine;
        return {
          id: r.id as string,
          groupId: r.group_id as string,
          startsAt: r.starts_at as string,
          durationMinutes: r.duration_minutes as number,
          place: (r.place as string | null) ?? null,
          status: r.status as SlotStatus,
          mine,
          bookedBy: seeWho && r.booked_by ? (mine ? "kamu" : names.get(r.booked_by as string) ?? "Pengguna") : null,
          topic: seeWho ? ((r.topic as string | null) ?? null) : null,
        };
      });
    return NextResponse.json({ slots, role });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/slots] GET gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    const role = accountId && UUID_RE.test(id) ? await roleInGroup(supabase, id, accountId) : null;
    if (role !== "mentor") return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const start = Date.parse(String(body.startsAt ?? ""));
    const duration = Number(body.durationMinutes);
    const count = Math.floor(Number(body.count ?? 1));
    const place = String(body.place ?? "").trim().slice(0, 200) || null;
    if (!Number.isFinite(start) || start < Date.now() - 5 * 60_000) {
      return NextResponse.json({ error: "Waktu mulainya harus di masa depan" }, { status: 400 });
    }
    if (!Number.isInteger(duration) || duration < 10 || duration > 120) {
      return NextResponse.json({ error: "Durasi slot 10 sampai 120 menit" }, { status: 400 });
    }
    if (!Number.isInteger(count) || count < 1 || count > SLOT_BATCH_MAX) {
      return NextResponse.json({ error: `Paling banyak ${SLOT_BATCH_MAX} slot sekaligus` }, { status: 400 });
    }

    const rows = Array.from({ length: count }, (_, i) => ({
      group_id: id,
      mentor_account_id: accountId,
      starts_at: new Date(start + i * duration * 60_000).toISOString(),
      duration_minutes: duration,
      place,
    }));
    const { error } = await supabase.from("group_slots").insert(rows);
    if (error) throw error;
    return NextResponse.json({ ok: true, created: count });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/slots] POST gagal:", error);
    return NextResponse.json({ error: "Slot belum tersimpan" }, { status: 500 });
  }
}
