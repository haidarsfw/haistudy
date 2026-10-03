import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";
import { findAccountByContact, markInvited, parseInviteList } from "@/lib/mentor/invites";

/** A class list, not a mailing list. Enough for any real class, small enough to stop a paste of a whole directory. */
const MAX_PER_PASTE = 80;
const MAX_PER_GROUP = 300;

/**
 * The mentor's invite list: entry path #1, attribution net #3.
 *
 * POST   { entries: "one per line" } — add contacts
 * DELETE ?inviteId=…                  — remove one that has not signed up yet
 *
 * A contact that already has an account is put in the group as 'invited'
 * straight away, but is NOT given a referrer: attributing an existing buyer is
 * net #4 (manual, by the owner, with proof). Otherwise this list could attach a
 * mentor to any old buyer whose address they happen to know.
 *
 * scope-exempt: the group's period is not the caller's. Identity from the
 * account cookie; only a mentor of this group may write.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    if ((await roleInGroup(supabase, id, account.id)) !== "mentor") {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as { entries?: string };
    const { valid, invalid } = parseInviteList(String(body.entries ?? "").slice(0, 20_000));
    if (!valid.length) {
      return NextResponse.json(
        { error: "Tidak ada email atau nomor WhatsApp yang terbaca.", invalid },
        { status: 400 }
      );
    }
    if (valid.length > MAX_PER_PASTE) {
      return NextResponse.json(
        { error: `Maksimal ${MAX_PER_PASTE} kontak sekali tempel.` },
        { status: 400 }
      );
    }
    const { count } = await supabase
      .from("group_invites")
      .select("id", { head: true, count: "exact" })
      .eq("group_id", id);
    if ((count ?? 0) + valid.length > MAX_PER_GROUP) {
      return NextResponse.json(
        { error: `Satu grup maksimal ${MAX_PER_GROUP} undangan.` },
        { status: 400 }
      );
    }

    let added = 0;
    let alreadyHaveAccount = 0;
    for (const c of valid) {
      const { data: row, error } = await supabase
        .from("group_invites")
        .upsert(
          { group_id: id, kind: c.kind, value: c.value, invited_by: account.id },
          { onConflict: "group_id,kind,value", ignoreDuplicates: true }
        )
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[mentor/invites] gagal menyimpan:", error.message);
        continue;
      }
      if (!row) continue; // already on the list
      added++;

      const existing = await findAccountByContact(supabase, c);
      if (existing && existing !== account.id) {
        await supabase
          .from("group_invites")
          .update({ account_id: existing, matched_at: new Date().toISOString() })
          .eq("id", row.id as string);
        await markInvited(supabase, id, existing, account.id);
        alreadyHaveAccount++;
      }
    }

    return NextResponse.json({ ok: true, added, alreadyHaveAccount, invalid });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("[mentor/invites] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    if ((await roleInGroup(supabase, id, account.id)) !== "mentor") {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }
    const inviteId = new URL(req.url).searchParams.get("inviteId") ?? "";
    // Only an invite nobody has used yet. One that matched a person is part of
    // the group's history and of how that person was attributed.
    const { data, error } = await supabase
      .from("group_invites")
      .delete()
      .eq("id", inviteId)
      .eq("group_id", id)
      .is("account_id", null)
      .select("id");
    if (error) return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
    if (!(data ?? []).length) {
      return NextResponse.json({ error: "Undangan tidak ada, atau orangnya sudah bergabung" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("[mentor/invites] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
