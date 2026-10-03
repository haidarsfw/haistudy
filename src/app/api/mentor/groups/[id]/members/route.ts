import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { ARCHIVED_ERROR, isGroupArchived, roleInGroup } from "@/lib/mentor/groups";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST { memberId, action } — the mentor's say over who is in the group.
 *
 *   remove  an active, pending or invited member → "removed": out of the
 *           group now, and the link, the code and "minta gabung" no longer
 *           let them back in (unlike "left", someone who left themselves).
 *   allow   "removed" → "left": they may come back by the link or code
 *           again; nobody is put back in without choosing to come.
 *
 * Only members, never a mentor's row, and never the group's owner: a group
 * changes hands from the admin panel.
 *
 * scope-exempt: the group's period is not the mentor's. Identity from the
 * account cookie; access from roleInGroup.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    if (!UUID_RE.test(id)) return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    const supabase = createServerClient()!;
    if ((await roleInGroup(supabase, id, account.id)) !== "mentor") {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as { memberId?: string; action?: string };
    const memberId = String(body.memberId ?? "");
    if (!UUID_RE.test(memberId) || (body.action !== "remove" && body.action !== "allow")) {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const [{ data: row }, { data: group }] = await Promise.all([
      supabase.from("group_members").select("id, account_id, role, status").eq("id", memberId).eq("group_id", id).maybeSingle(),
      supabase.from("mentor_groups").select("owner_account_id").eq("id", id).maybeSingle(),
    ]);
    if (!row || row.role !== "member" || row.account_id === group?.owner_account_id) {
      return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    }

    if (body.action === "remove") {
      if (!["active", "pending", "invited"].includes(row.status as string)) {
        return NextResponse.json({ error: "Orang ini sudah tidak di grup" }, { status: 409 });
      }
      const { error } = await supabase
        .from("group_members")
        .update({ status: "removed", left_at: new Date().toISOString() })
        .eq("id", memberId);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "removed" });
    }

    if (row.status !== "removed") {
      return NextResponse.json({ error: "Orang ini tidak sedang dikeluarkan" }, { status: 409 });
    }
    const { error } = await supabase.from("group_members").update({ status: "left" }).eq("id", memberId);
    if (error) throw error;
    return NextResponse.json({ ok: true, status: "left" });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("[mentor/members] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
