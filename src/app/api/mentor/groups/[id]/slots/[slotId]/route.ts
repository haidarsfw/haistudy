import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";
import { notify, requestingAccountId } from "@/lib/mentor/requests";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import { SLOT_CANCEL_LEAD_MS } from "@/lib/mentor/slots";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "Sab, 11 Okt 19.00" in WIB: the server's clock is UTC, the members' is not. */
function when(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * PATCH one slot.
 *   { action: "book", topic? }  a member takes an open slot (one upcoming
 *                               booking per member per group); the mentor
 *                               is notified
 *   { action: "unbook" }        the member gives it back, up to an hour
 *                               before; it opens again
 *   { action: "cancel" }        the mentor closes it; whoever booked it is
 *                               told
 *
 * Booking is one conditional update (status still 'open'), so two members
 * tapping the same slot cannot both get it.
 *
 * scope-exempt: the group's audience is its members, not a period.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; slotId: string }> }) {
  try {
    const { id, slotId } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId || !UUID_RE.test(id) || !UUID_RE.test(slotId)) {
      return NextResponse.json({ error: "Slot tidak ditemukan" }, { status: 404 });
    }
    const role = await roleInGroup(supabase, id, accountId);
    if (!role) return NextResponse.json({ error: "Slot tidak ditemukan" }, { status: 404 });
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const [{ data: slot }, { data: group }] = await Promise.all([
      supabase
        .from("group_slots")
        .select("id, mentor_account_id, starts_at, status, booked_by")
        .eq("id", slotId)
        .eq("group_id", id)
        .maybeSingle(),
      supabase.from("mentor_groups").select("id, name").eq("id", id).maybeSingle(),
    ]);
    if (!slot || !group) return NextResponse.json({ error: "Slot tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => ({}))) as { action?: string; topic?: string };
    const startsAt = slot.starts_at as string;
    const start = Date.parse(startsAt);

    if (body.action === "book") {
      if (role !== "member") return NextResponse.json({ error: "Slot ini untuk anggota grup" }, { status: 403 });
      if (start <= Date.now()) return NextResponse.json({ error: "Slot ini sudah lewat" }, { status: 409 });
      const { count } = await supabase
        .from("group_slots")
        .select("id", { head: true, count: "exact" })
        .eq("group_id", id)
        .eq("booked_by", accountId)
        .eq("status", "booked")
        .gt("starts_at", new Date().toISOString());
      if (count) {
        return NextResponse.json(
          { error: "Kamu sudah punya satu jadwal 1-on-1 di grup ini. Batalkan dulu kalau mau pindah." },
          { status: 409 }
        );
      }
      const topic = String(body.topic ?? "").trim().slice(0, 300) || null;
      const { data: took } = await supabase
        .from("group_slots")
        .update({ status: "booked", booked_by: accountId, booked_at: new Date().toISOString(), topic })
        .eq("id", slotId)
        .eq("status", "open")
        .select("id");
      if (!took?.length) {
        return NextResponse.json({ error: "Slot ini baru saja diambil orang lain." }, { status: 409 });
      }
      const name = (await displayNamesForAccounts(supabase, [accountId])).get(accountId) ?? "Anggota";
      waitUntil(
        notify(
          supabase,
          slot.mentor_account_id as string,
          { id: group.id as string, name: group.name as string },
          "slot_booked",
          name,
          `1-on-1 ${when(startsAt)}${topic ? `: ${topic}` : ""}`,
          "/partner"
        ).catch(() => {})
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "unbook") {
      if (slot.booked_by !== accountId || slot.status !== "booked") {
        return NextResponse.json({ error: "Ini bukan jadwalmu" }, { status: 404 });
      }
      if (start - Date.now() < SLOT_CANCEL_LEAD_MS) {
        return NextResponse.json(
          { error: "Batal paling lambat satu jam sebelumnya. Kabari mentormu lewat chat grup." },
          { status: 409 }
        );
      }
      const { error } = await supabase
        .from("group_slots")
        .update({ status: "open", booked_by: null, booked_at: null, topic: null })
        .eq("id", slotId)
        .eq("booked_by", accountId);
      if (error) throw error;
      const name = (await displayNamesForAccounts(supabase, [accountId])).get(accountId) ?? "Anggota";
      waitUntil(
        notify(
          supabase,
          slot.mentor_account_id as string,
          { id: group.id as string, name: group.name as string },
          "slot_cancelled",
          name,
          `Membatalkan 1-on-1 ${when(startsAt)}; slotnya terbuka lagi`,
          "/partner"
        ).catch(() => {})
      );
      return NextResponse.json({ ok: true });
    }

    if (body.action === "cancel") {
      if (role !== "mentor") return NextResponse.json({ error: "Slot tidak ditemukan" }, { status: 404 });
      if (slot.status === "cancelled") return NextResponse.json({ ok: true });
      const booker = (slot.booked_by as string | null) ?? null;
      const { error } = await supabase
        .from("group_slots")
        .update({ status: "cancelled", booked_by: null, booked_at: null })
        .eq("id", slotId);
      if (error) throw error;
      if (booker) {
        const name = (await displayNamesForAccounts(supabase, [accountId])).get(accountId) ?? "Mentor";
        waitUntil(
          notify(
            supabase,
            booker,
            { id: group.id as string, name: group.name as string },
            "slot_cancelled",
            name,
            `Mentor membatalkan 1-on-1 ${when(startsAt)}. Pilih slot lain di jadwal grup.`
          ).catch(() => {})
        );
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[group/slots] PATCH gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
