import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { GROUP_COLUMNS, activeMemberCount, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { eqScope } from "@/lib/scope";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { accountId, toGroupId } — move a member from this group to another
 * group of the SAME period. The owner's call, not a mentor's: it takes a
 * mentee out of one mentor's group and puts them in another's.
 *
 * The old row becomes "left" (kept: attendance and messages keep their
 * author), the new one is active. A full target group still takes them,
 * since the owner decided it, and the answer says so.
 *
 * scope-exempt: the groups carry the period they teach. Identity from
 * `validateAdmin`.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { accountId?: string; toGroupId?: string };
  const accountId = String(body.accountId ?? "");
  const toGroupId = String(body.toGroupId ?? "");
  if (!UUID_RE.test(id) || !UUID_RE.test(accountId) || !UUID_RE.test(toGroupId) || id === toGroupId) {
    return NextResponse.json({ error: "Data pindah tidak lengkap" }, { status: 400 });
  }

  const supabase = createServerClient()!;
  const [{ data: from }, { data: to }, { data: member }] = await Promise.all([
    supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", toGroupId).maybeSingle(),
    supabase
      .from("group_members")
      .select("role, status")
      .eq("group_id", id)
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (!from || !to) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
  const src = toMentorGroup(from as GroupRow);
  const dst = toMentorGroup(to as GroupRow);
  if (!eqScope(src.scope, dst.scope)) {
    return NextResponse.json({ error: "Grup tujuan mengajar periode yang berbeda" }, { status: 400 });
  }
  if (dst.status !== "active") {
    return NextResponse.json({ error: "Grup tujuan sudah diarsipkan" }, { status: 409 });
  }
  if (!member || member.status !== "active" || member.role !== "member") {
    return NextResponse.json({ error: "Orang itu bukan anggota aktif grup ini" }, { status: 404 });
  }
  if (dst.ownerAccountId === accountId) {
    return NextResponse.json({ error: "Orang itu mentor grup tujuan" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: inErr } = await supabase.from("group_members").upsert(
    { group_id: toGroupId, account_id: accountId, role: "member", status: "active", joined_at: now, left_at: null },
    { onConflict: "group_id,account_id" }
  );
  if (inErr) {
    console.error("Pindah anggota: masuk grup tujuan gagal", inErr.message);
    return NextResponse.json({ error: "Belum tersimpan" }, { status: 500 });
  }
  const { error: outErr } = await supabase
    .from("group_members")
    .update({ status: "left", left_at: now })
    .eq("group_id", id)
    .eq("account_id", accountId);
  if (outErr) console.error("Pindah anggota: keluar dari grup asal gagal", outErr.message);

  const count = await activeMemberCount(supabase, toGroupId);
  console.log(`Anggota ${accountId} dipindah ${id} → ${toGroupId} oleh ${licenseKey}`);
  return NextResponse.json({
    ok: true,
    note:
      dst.maxMembers !== null && count > dst.maxMembers
        ? `Grup tujuan sekarang ${count} orang, di atas batasnya (${dst.maxMembers}).`
        : null,
  });
}
