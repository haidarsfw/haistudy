import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { lookupReferralCode, normalizeReferralCode } from "@/lib/referral/codes";

/**
 * `haistudy.site/@nama` — a partner's link.
 *
 * Reached by rewrite from `src/proxy.ts`, because `@nama` cannot be a route of
 * its own: the app already owns the root dynamic segment (`[semester]`), and
 * Next refuses two different slug names at the same level.
 *
 * What it does is remember who sent this person, then get out of the way. It
 * lands on the home page rather than on the sign-up form: someone who has never
 * heard of haistudy needs to see what it is before being asked for an e-mail,
 * and the cookie survives the browsing in between.
 *
 * The handle is either the referral code itself (`HAIDAR42`) or the owner's
 * nickname (`haidar`), because both are things a partner will read out loud and
 * neither is worth losing a referral over.
 */

/** 7 days — the owner's call. Long enough for "I'll buy it tonight", short
 *  enough that a link clicked last term does not claim someone months later. */
const REF_COOKIE_DAYS = 7;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ handle: string }> }
) {
  // scope-exempt: a public landing route. No session, no period — it only
  // writes a cookie that /register and /auth/callback read back.
  const { handle } = await ctx.params;
  // The request's own origin, never NEXT_PUBLIC_APP_URL. That variable names
  // production, so on localhost or a preview build it would have thrown the
  // visitor across to the live site — losing the cookie, because it was set on
  // a different origin. Same trap as the OAuth redirect fixed in 72277ef.
  const home = new URL("/", req.url);

  const raw = decodeURIComponent(handle ?? "").replace(/^@/, "");
  const code = normalizeReferralCode(raw);
  if (!code || !isSupabaseServerConfigured) {
    return NextResponse.redirect(home);
  }

  const supabase = createServerClient()!;

  // The code as given, then the nickname it might be.
  let resolved = await lookupReferralCode(supabase, code).catch(() => null);
  if (!resolved) {
    const { data: acc } = await supabase
      .from("accounts")
      .select("id")
      .ilike("nickname", raw)
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

  const res = NextResponse.redirect(home);
  // An unknown handle lands on the home page with nothing attached. Saying
  // "that code does not exist" here would turn the route into an oracle for
  // walking the code space, which /api/account/referral/check is rate-limited
  // to prevent.
  if (resolved) {
    res.cookies.set("hs-ref", resolved.code, {
      path: "/",
      maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      // Readable by the sign-up form, which prefills the field from it. The
      // value is a public referral code, not a credential.
      httpOnly: false,
    });
  }
  return res;
}
