import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolvePartnerHandle, setInviteCookies } from "@/lib/referral/partner-link";

/**
 * `haistudy.site/@nama/grup` — a mentor's link that ALSO puts you in their group.
 *
 * The owner's decision (3 Oct 2026): this is the main way into a group, with the
 * six-letter code kept as a backup for reading out in class. It does what
 * `/@nama` does — remembers who sent this person, for the referral — and then
 * sends them to the join page of the mentor's group.
 *
 * A mentor with more than one active group gets the newest one. A mentor
 * teaches one period at a time, and the newest group is the one their current
 * class was just told about; an older one still open is last term's.
 *
 * A handle with no open group behaves exactly like `/@nama`: the referral is
 * still worth keeping, and a dead link would lose it.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  // scope-exempt: public landing route, no session and no period.
  const { handle } = await ctx.params;
  const home = new URL("/", req.url);
  if (!isSupabaseServerConfigured) return NextResponse.redirect(home);

  const supabase = createServerClient()!;
  const who = await resolvePartnerHandle(supabase, handle ?? "");
  if (!who) return NextResponse.redirect(home);

  let target = home;
  if (who.accountId) {
    const { data: group } = await supabase
      .from("mentor_groups")
      .select("invite_code")
      .eq("owner_account_id", who.accountId)
      .eq("status", "active")
      .eq("invite_open", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (group?.invite_code) {
      target = new URL(`/grup/${group.invite_code as string}`, req.url);
    }
  }

  const res = NextResponse.redirect(target);
  setInviteCookies(res, who);
  return res;
}
