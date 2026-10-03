import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { mintAccountReferralCode } from "@/lib/referral/codes";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import {
  GROUP_COLUMNS,
  activateMentorPartner,
  activeMemberCount,
  toMentorGroup,
  type GroupRow,
} from "@/lib/mentor/groups";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Satu grup mentoring, sisi pemilik: siapa di dalamnya, dan empat keputusan
 * yang memang milik pemilik, bukan mentornya.
 *
 *   GET    anggota + statusnya (termasuk yang keluar dan ditolak: ini panel
 *          pemilik, riwayatnya ikut dibaca)
 *   PATCH  { action: "archive" | "unarchive" }
 *          { action: "limit", maxMembers: number | null }
 *          { action: "invite", inviteOpen: boolean }
 *          { action: "handover", email: string }
 *
 * scope-exempt: grup membawa periode yang DIAJARKAN, bukan periode admin yang
 * sedang membuka panel. Identitas dari `validateAdmin`.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { authorized } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

  const supabase = createServerClient()!;
  const [{ data: group }, { data: rows }] = await Promise.all([
    supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).maybeSingle(),
    supabase
      .from("group_members")
      .select("account_id, role, status, joined_at, left_at, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!group) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

  const ids = (rows ?? []).map((r) => r.account_id as string);
  const [names, { data: accounts }] = await Promise.all([
    displayNamesForAccounts(supabase, ids),
    ids.length
      ? supabase.from("accounts").select("id, email").in("id", ids)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);
  const emailOf = new Map((accounts ?? []).map((a) => [a.id as string, a.email as string]));

  return NextResponse.json({
    group: toMentorGroup(group as GroupRow),
    members: (rows ?? []).map((r) => ({
      accountId: r.account_id as string,
      name: names.get(r.account_id as string) ?? "Pengguna",
      email: emailOf.get(r.account_id as string) ?? null,
      role: r.role as string,
      status: r.status as string,
      joinedAt: (r.joined_at as string | null) ?? null,
      leftAt: (r.left_at as string | null) ?? null,
    })),
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

  const supabase = createServerClient()!;
  const { data: group } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).maybeSingle();
  if (!group) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
  const row = group as GroupRow;

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    maxMembers?: number | null;
    inviteOpen?: boolean;
    email?: string;
  };
  const now = new Date().toISOString();
  const update = (patch: Record<string, unknown>) =>
    supabase
      .from("mentor_groups")
      .update({ ...patch, updated_at: now })
      .eq("id", id)
      .select(GROUP_COLUMNS)
      .single();

  switch (body.action) {
    // Archiving keeps everything readable and lets nothing new in (every
    // group write route checks isGroupArchived). The mentor's perks end with
    // it, since being a mentor is holding a RUNNING group.
    case "archive":
    case "unarchive": {
      const { data, error } = await update({ status: body.action === "archive" ? "archived" : "active" });
      if (error || !data) return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
      console.log(`Grup ${id} ${body.action === "archive" ? "diarsipkan" : "diaktifkan lagi"} oleh ${licenseKey}`);
      return NextResponse.json({ group: toMentorGroup(data as GroupRow) });
    }

    // A lower limit than the group already has removes nobody: it only stops
    // new people coming in until the group is under it again.
    case "limit": {
      const raw = body.maxMembers;
      const maxMembers = typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null;
      if (maxMembers !== null && maxMembers > 500) {
        return NextResponse.json({ error: "Batas anggota maksimal 500" }, { status: 400 });
      }
      const { data, error } = await update({ max_members: maxMembers });
      if (error || !data) return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
      const active = await activeMemberCount(supabase, id);
      return NextResponse.json({
        group: toMentorGroup(data as GroupRow),
        note:
          maxMembers !== null && active > maxMembers
            ? `Grup ini sudah berisi ${active} orang. Tidak ada yang dikeluarkan; yang baru ditahan sampai jumlahnya di bawah ${maxMembers}.`
            : null,
      });
    }

    case "invite": {
      if (typeof body.inviteOpen !== "boolean") {
        return NextResponse.json({ error: "inviteOpen wajib true/false" }, { status: 400 });
      }
      const { data, error } = await update({ invite_open: body.inviteOpen });
      if (error || !data) return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
      return NextResponse.json({ group: toMentorGroup(data as GroupRow) });
    }

    // Hand the group to another mentor: the new one owns it and is a mentor
    // member; the old one leaves it. Chat, sessions and notes stay where they
    // are (old messages keep their frozen "Mentor" label). Money does not
    // move: commissions already recorded are frozen, and who a buyer is
    // attributed to is decided by how they came in, not by who teaches now.
    case "handover": {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return NextResponse.json({ error: "Email mentor baru wajib diisi" }, { status: 400 });
      const { data: next } = await supabase
        .from("accounts")
        .select("id, email")
        .eq("email_lower", email)
        .maybeSingle();
      if (!next) return NextResponse.json({ error: "Belum ada akun dengan email itu" }, { status: 404 });
      const nextId = next.id as string;
      if (nextId === row.owner_account_id) {
        return NextResponse.json({ error: "Orang itu sudah mentor grup ini" }, { status: 400 });
      }

      const { data, error } = await update({ owner_account_id: nextId });
      if (error || !data) return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });

      // One row per person per group, forever (unique group_id, account_id):
      // someone who was a member before becomes the mentor on the same row.
      const { error: inErr } = await supabase.from("group_members").upsert(
        { group_id: id, account_id: nextId, role: "mentor", status: "active", joined_at: now, left_at: null },
        { onConflict: "group_id,account_id" }
      );
      const { error: outErr } = await supabase
        .from("group_members")
        .update({ status: "left", left_at: now })
        .eq("group_id", id)
        .eq("account_id", row.owner_account_id);
      if (inErr || outErr) console.error("Serah terima grup: baris anggota gagal", inErr?.message, outErr?.message);

      await mintAccountReferralCode(supabase, nextId).catch((e) =>
        console.error("Kode referral mentor baru gagal dibuat:", e)
      );
      const partnerStatus = await activateMentorPartner(
        supabase,
        nextId,
        `Mentor grup "${row.name}" (serah terima)`,
        licenseKey
      );
      console.log(`Grup ${id} diserahkan ke ${next.email} oleh ${licenseKey}, partner=${partnerStatus}`);
      return NextResponse.json({ group: toMentorGroup(data as GroupRow), partnerStatus });
    }

    default:
      return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  }
}
