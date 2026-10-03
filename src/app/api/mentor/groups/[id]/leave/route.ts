import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ARCHIVED_ERROR, isGroupArchived } from "@/lib/mentor/groups";
import { requestingAccountId } from "@/lib/mentor/requests";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/mentor/groups/:id/leave — leave a group yourself.
 *
 * The row becomes "left" and is kept (attendance and messages keep their
 * author). Leaving is not being removed: someone who left can come back by
 * the group's link or code while it is open.
 *
 * The group's owner cannot leave it; a group is handed to another mentor
 * from the admin panel instead, or it would be left without its mentor.
 *
 * scope-exempt: a group's audience is its members, not a period. Identity
 * from the account, or from the licence's account inside the app.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) return NextResponse.json({ error: "Masuk dulu, ya." }, { status: 401 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });

    const [{ data: group }, { data: member }] = await Promise.all([
      supabase.from("mentor_groups").select("owner_account_id").eq("id", id).maybeSingle(),
      supabase
        .from("group_members")
        .select("status")
        .eq("group_id", id)
        .eq("account_id", accountId)
        .maybeSingle(),
    ]);
    if (!group || member?.status !== "active") {
      return NextResponse.json({ error: "Kamu tidak sedang di grup ini" }, { status: 404 });
    }
    if (group.owner_account_id === accountId) {
      return NextResponse.json(
        { error: "Pemilik grup tidak bisa keluar. Minta haistudy menyerahkan grupnya ke mentor lain." },
        { status: 400 }
      );
    }
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const { error } = await supabase
      .from("group_members")
      .update({ status: "left", left_at: new Date().toISOString() })
      .eq("group_id", id)
      .eq("account_id", accountId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[mentor] keluar grup gagal:", error);
    return NextResponse.json({ error: "Belum berhasil keluar. Coba lagi." }, { status: 500 });
  }
}
