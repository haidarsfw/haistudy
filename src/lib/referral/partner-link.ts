import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { lookupReferralCode, normalizeReferralCode } from "@/lib/referral/codes";

/**
 * Shared by `/@nama` and `/@nama/grup`: who does this handle belong to, and
 * remember that they sent this visitor.
 *
 * One copy, because the two links must agree. A handle that resolves on one
 * and not the other would credit a mentor for an outsider and lose the credit
 * for their own mentee.
 */

/** 7 days — the owner's call. Long enough for "I'll buy it tonight", short
 *  enough that a link clicked last term does not claim someone months later. */
export const REF_COOKIE_DAYS = 7;

export interface ResolvedHandle {
  /** The referral code to attach at sign-up. */
  code: string;
  /** The account that owns it; null for a campaign code. */
  accountId: string | null;
  /** Name shown on the invite banner. Empty when there is nothing to show. */
  inviter: string;
}

/**
 * The handle is either the referral code itself (`HAIDAR42`) or the owner's
 * nickname (`haidar`), because both are things a partner will read out loud
 * and neither is worth losing a referral over.
 */
export async function resolvePartnerHandle(
  supabase: SupabaseClient,
  rawHandle: string
): Promise<ResolvedHandle | null> {
  const raw = decodeURIComponent(rawHandle ?? "").replace(/^@/, "");
  const code = normalizeReferralCode(raw);
  if (!code) return null;

  let resolved = await lookupReferralCode(supabase, code).catch(() => null);
  if (!resolved) {
    // `code`, not `raw`. The raw segment reaches ilike with its LIKE wildcards
    // intact, so `hai%25` becomes a prefix SEARCH over every nickname and the
    // list can be walked one character at a time. normalizeReferralCode strips
    // everything that is not alphanumeric, which nicknames already are.
    const { data: acc } = await supabase
      .from("accounts")
      .select("id")
      .ilike("nickname", code)
      .maybeSingle();
    if (acc?.id) {
      const { data: own } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("account_id", acc.id)
        .eq("kind", "account")
        .maybeSingle();
      if (own?.code) {
        resolved = await lookupReferralCode(supabase, own.code as string).catch(() => null);
      }
    }
  }
  if (!resolved) return null;

  let inviter = "";
  if (resolved.accountId) {
    const { data: owner } = await supabase
      .from("accounts")
      .select("nickname")
      .eq("id", resolved.accountId)
      .maybeSingle();
    inviter = ((owner?.nickname as string) ?? "").slice(0, 32);
  } else if (resolved.label) {
    // Campaign codes have no account; their label is the human-readable name.
    inviter = resolved.label.slice(0, 32);
  }

  return { code: resolved.code, accountId: resolved.accountId ?? null, inviter };
}

/**
 * Who sent them, carried in cookies rather than looked up on the landing page.
 * Reading a cookie server-side would make the home page dynamic on EVERY visit,
 * a Vercel invocation each time, for a banner almost nobody sees.
 *
 * Readable by the sign-up form, which prefills the field from it. The value is
 * a public referral code, not a credential.
 */
export function setInviteCookies(res: NextResponse, who: ResolvedHandle): void {
  const maxAge = REF_COOKIE_DAYS * 24 * 60 * 60;
  res.cookies.set("hs-ref", who.code, { path: "/", maxAge, sameSite: "lax", httpOnly: false });
  if (who.inviter) {
    res.cookies.set("hs-ref-by", who.inviter, {
      path: "/",
      maxAge,
      sameSite: "lax",
      httpOnly: false,
    });
  }
}
