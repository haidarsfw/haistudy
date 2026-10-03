import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { mintAccountReferralCode } from "@/lib/referral/codes";
import { setInviteCookies } from "@/lib/referral/partner-link";

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * "Daftar untuk bergabung" on the group join page goes through here first.
 *
 * Two paths reach a group: `/@nama/grup`, which already remembers the mentor
 * as the referrer, and the six-letter code read out in class, which carries no
 * referral at all. Without this step the second path signed people up with no
 * code, and since a referral attaches only when an account is created, the
 * mentor lost that commission permanently — for a mentee in their own group.
 * Here both paths credit the same person: the group's owner.
 *
 * scope-exempt: public, no session and no period. It only sets the referral
 * cookie and redirects.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await ctx.params;
  const code = String(raw ?? "").toUpperCase();
  const back = new URL(`/grup/${code}`, req.url);
  if (!CODE_RE.test(code) || !isSupabaseServerConfigured) return NextResponse.redirect(back);

  const register = new URL("/register", req.url);
  register.searchParams.set("next", `/grup/${code}`);
  const res = NextResponse.redirect(register);

  const supabase = createServerClient()!;
  const { data: group } = await supabase
    .from("mentor_groups")
    .select("owner_account_id, status, invite_open")
    .eq("invite_code", code)
    .maybeSingle();
  if (!group || group.status !== "active" || !group.invite_open) return res;

  const ownerId = group.owner_account_id as string;
  // Minted if missing: a mentor whose account predates codes must still be
  // credited for the mentee who joins by the class code.
  const referral = await mintAccountReferralCode(supabase, ownerId).catch(() => null);
  if (!referral) return res;

  const { data: owner } = await supabase
    .from("accounts")
    .select("nickname")
    .eq("id", ownerId)
    .maybeSingle();
  setInviteCookies(res, {
    code: referral,
    accountId: ownerId,
    inviter: ((owner?.nickname as string) ?? "").slice(0, 32),
  });
  return res;
}
