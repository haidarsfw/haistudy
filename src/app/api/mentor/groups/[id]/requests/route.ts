import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { ARCHIVED_ERROR, GROUP_COLUMNS, activeMemberCount, isGroupArchived, roleInGroup, type GroupRow } from "@/lib/mentor/groups";
import { notifyRequestApproved } from "@/lib/mentor/requests";

/**
 * POST /api/mentor/groups/:id/requests — the mentor's one tap.
 * Body: { memberId, action: "approve" | "decline" }
 *
 * Only a request still waiting can be answered, so a double tap, or two
 * mentors of the same group answering at once, cannot flip a decision: the
 * update is conditional on status = 'pending' and the second one finds nothing.
 * A declined request is kept, not deleted (migration 083), so the same person
 * does not land in the mentor's inbox again.
 *
 * scope-exempt: the group's period is not the caller's. Identity from the
 * account cookie; access from roleInGroup.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const account = await requireAccount();
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }
    const supabase = createServerClient()!;
    if ((await roleInGroup(supabase, id, account.id)) !== "mentor") {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }
    if (await isGroupArchived(supabase, id)) {
      return NextResponse.json({ error: ARCHIVED_ERROR }, { status: 409 });
    }

    const body = (await req.json().catch(() => ({}))) as { memberId?: string; action?: string };
    const memberId = String(body.memberId ?? "");
    const action = body.action;
    if (!memberId || (action !== "approve" && action !== "decline")) {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const { data: g } = await supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).single();
    const group = g as GroupRow;

    if (action === "approve" && group.max_members !== null) {
      if ((await activeMemberCount(supabase, id)) >= group.max_members) {
        return NextResponse.json(
          { error: `Grup sudah penuh (${group.max_members} anggota). Minta admin menaikkan batasnya dulu.` },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();
    const { data: done, error } = await supabase
      .from("group_members")
      .update(
        action === "approve"
          ? { status: "active", joined_at: now, left_at: null }
          : { status: "declined" }
      )
      .eq("id", memberId)
      .eq("group_id", id)
      .eq("status", "pending")
      .select("account_id");
    if (error) {
      console.error("[mentor/requests] gagal:", error.message);
      return NextResponse.json({ error: "Gagal menyimpan jawaban" }, { status: 500 });
    }
    if (!(done ?? []).length) {
      return NextResponse.json(
        { error: "Permintaan ini sudah dijawab, atau sudah tidak ada." },
        { status: 409 }
      );
    }

    if (action === "approve") {
      waitUntil(
        notifyRequestApproved(supabase, done![0].account_id as string, group).catch(() => {})
      );
    }
    return NextResponse.json({ ok: true, state: action === "approve" ? "member" : "declined" });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("[mentor/requests] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
