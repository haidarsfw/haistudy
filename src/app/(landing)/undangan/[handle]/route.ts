import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { resolvePartnerHandle, setInviteCookies } from "@/lib/referral/partner-link";

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
 * Deliberately NOT rate-limited, unlike /api/account/referral/check. That one
 * guards a form; this is a link people click in a group. The throttle there is
 * per IP and backed by a row in `account_rate_events` — on a public URL that is
 * a database write per click, and a mentor showing the link to a class on one
 * campus network would trip it. What the throttle protects is also thinner
 * here: a referral code is meant to be shared, and learning that one exists
 * buys nothing but the ability to credit someone else's referral.
 */
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
  if (!isSupabaseServerConfigured) return NextResponse.redirect(home);

  const who = await resolvePartnerHandle(createServerClient()!, handle ?? "");
  const res = NextResponse.redirect(home);
  // An unknown handle lands on the home page with nothing attached. Saying
  // "that code does not exist" here would turn the route into an oracle for
  // walking the code space, which /api/account/referral/check is rate-limited
  // to prevent.
  if (who) setInviteCookies(res, who);
  return res;
}
