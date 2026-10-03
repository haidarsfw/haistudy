import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { GROUP_COLUMNS, roleInGroup, toMentorGroup, type GroupRow } from "@/lib/mentor/groups";
import { mintAccountReferralCode } from "@/lib/referral/codes";
import { displayNamesForAccounts } from "@/lib/mentor/names";

/**
 * One group, as its mentor sees it: who is in, who is invited, who was asked
 * and has not signed up yet, and the links to share.
 *
 * Only a MENTOR of this group gets an answer. A member asking gets 404, the
 * same as a stranger: the member list and the invited contacts are the
 * mentor's working list, not something every mentee should read.
 *
 * scope-exempt: the group's period is not the caller's (a mentor on semester 3
 * teaching semester 1). Identity from the account cookie; access from
 * roleInGroup.
 */
export async function GET(
  _req: Request,
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

    const [{ data: group }, { data: members }, { data: invites }] = await Promise.all([
      supabase.from("mentor_groups").select(GROUP_COLUMNS).eq("id", id).single(),
      supabase
        .from("group_members")
        .select("id, account_id, role, status, joined_at, created_at")
        .eq("group_id", id)
        // Left and declined are history, not the group.
        .not("status", "in", "(left,declined)")
        .order("created_at", { ascending: true }),
      supabase
        .from("group_invites")
        .select("id, kind, value, account_id, matched_at, created_at")
        .eq("group_id", id)
        .order("created_at", { ascending: false }),
    ]);

    // Nickname, else the name on their licence: "Tanpa nama" told the mentor
    // nothing about who had joined.
    const nameOf = await displayNamesForAccounts(
      supabase,
      (members ?? []).map((m) => m.account_id as string)
    );

    // Minted if missing, so the group link shown here can always carry it.
    const referral = await mintAccountReferralCode(supabase, account.id).catch(() => null);

    return NextResponse.json({
      group: toMentorGroup(group as GroupRow),
      referralCode: referral,
      members: (members ?? []).map((m) => ({
        // The handle the mentor's approve/decline buttons answer with.
        memberId: m.id,
        name: nameOf.get(m.account_id as string) ?? "Tanpa nama",
        role: m.role,
        status: m.status,
        joinedAt: m.joined_at,
        isYou: m.account_id === account.id,
      })),
      invites: (invites ?? []).map((v) => ({
        id: v.id,
        kind: v.kind,
        value: v.value,
        joined: Boolean(v.account_id),
        createdAt: v.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("[mentor/groups/:id] gagal:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
