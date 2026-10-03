import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { displayNamesForAccounts } from "@/lib/mentor/names";
import {
  GROUP_COLUMNS,
  activeMemberCount,
  checkGroupJoinQuota,
  recordGroupJoinAttempt,
  type GroupRow,
} from "@/lib/mentor/groups";
import { notifyMentorsOfRequest, requestingAccountId } from "@/lib/mentor/requests";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/mentor/groups/:id/request — ask to join (entry path #3).
 *
 * The answer is always a state the screen can show as is:
 *   member   already in (or was invited, which this accepts)
 *   pending  waiting for the mentor
 *   declined asked before and was turned down; not asked again
 *
 * Allowed while the group's link is closed: a closed link stops people walking
 * in, it does not stop them asking. Counted against the same limit as joining
 * by code, so a script cannot fill a mentor's inbox.
 *
 * scope-exempt: the group's period is not necessarily the caller's (a mentee
 * asks before buying it). Identity from the account, or from the licence's
 * account inside the app.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }
    const supabase = createServerClient()!;
    const accountId = await requestingAccountId(supabase);
    if (!accountId) {
      return NextResponse.json(
        { error: "Masuk dengan akunmu dulu untuk minta gabung.", code: "NO_ACCOUNT" },
        { status: 401 }
      );
    }
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }

    const gate = await checkGroupJoinQuota(supabase, accountId);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
      );
    }
    await recordGroupJoinAttempt(supabase, accountId);

    const { data: g } = await supabase
      .from("mentor_groups")
      .select(GROUP_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    const group = g as GroupRow | null;
    if (!group || group.status !== "active") {
      return NextResponse.json({ error: "Grup tidak ditemukan" }, { status: 404 });
    }
    if (group.owner_account_id === accountId) {
      return NextResponse.json({ ok: true, state: "member" });
    }

    const { data: existing } = await supabase
      .from("group_members")
      .select("id, status")
      .eq("group_id", id)
      .eq("account_id", accountId)
      .maybeSingle();

    switch (existing?.status) {
      case "active":
        return NextResponse.json({ ok: true, state: "member" });
      case "pending":
        return NextResponse.json({ ok: true, state: "pending" });
      case "declined":
        return NextResponse.json(
          {
            state: "declined",
            error:
              "Permintaanmu ke grup ini belum disetujui. Hubungi mentornya langsung kalau kamu memang bagian dari kelasnya.",
          },
          { status: 409 }
        );
      case "invited": {
        // The mentor already asked for this person; asking back is a yes.
        if (group.max_members !== null && (await activeMemberCount(supabase, id)) >= group.max_members) {
          return NextResponse.json({ error: "Grup ini sudah penuh" }, { status: 409 });
        }
        await supabase
          .from("group_members")
          .update({ status: "active", joined_at: new Date().toISOString(), left_at: null })
          .eq("id", existing.id as string);
        return NextResponse.json({ ok: true, state: "member" });
      }
    }

    // New, or left earlier: a request. The role is never touched here (a
    // co-mentor who left keeps theirs; a member never gains it).
    const { error } = existing
      ? await supabase
          .from("group_members")
          .update({ status: "pending", left_at: null })
          .eq("id", existing.id as string)
      : await supabase.from("group_members").insert({
          group_id: id,
          account_id: accountId,
          role: "member",
          status: "pending",
        });
    if (error) {
      console.error("[mentor/request] gagal menyimpan:", error.message);
      return NextResponse.json({ error: "Gagal mengirim permintaan" }, { status: 500 });
    }

    const name = (await displayNamesForAccounts(supabase, [accountId])).get(accountId) ?? "Pengguna";
    // Off the critical path: the request stands even if a notification fails.
    waitUntil(notifyMentorsOfRequest(supabase, group, name).catch(() => {}));

    return NextResponse.json({ ok: true, state: "pending" });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[mentor/request] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
