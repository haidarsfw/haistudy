import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";
import {
  checkReferralCheckQuota,
  lookupReferralCode,
  normalizeReferralCode,
  recordReferralCheck,
} from "@/lib/referral/codes";

/**
 * "Is this referral code real?" — answered for anyone, before they have an
 * account.
 *
 * The reply is one bit. Never the owner's name, never why a code was refused,
 * never the difference between never-existed and expired. Any of those turns
 * this into a tool for mapping the code space, and the whole reason the
 * endpoint is rate-limited is that a yes/no oracle is the thing people walk.
 *
 * `valid: null` means WE could not answer — no database, quota hit, something
 * threw. The form treats that as "let them through without the code" rather
 * than as a rejection. A signup lost to our own outage is worse than a
 * referral we failed to record.
 */
export async function GET(req: Request) {
  // scope-exempt: runs before any account or scope exists, and touches only
  // the referral tables, which have no scope columns.
  const url = new URL(req.url);
  const code = normalizeReferralCode(url.searchParams.get("code") ?? "");

  if (!code) return NextResponse.json({ valid: false, code: "" });

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ valid: null, code });
  }

  try {
    const supabase = createServerClient()!;
    const ip = getClientIp(req);

    const gate = await checkReferralCheckQuota(supabase, ip);
    if (!gate.allowed) {
      return NextResponse.json(
        { valid: null, code, reason: "rate_limited" },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
      );
    }
    // Counted whether or not the code turns out to exist. Counting only misses
    // would make a hit free, which is the opposite of what a limit is for.
    await recordReferralCheck(supabase, ip);

    const found = await lookupReferralCode(supabase, code);
    return NextResponse.json({ valid: Boolean(found), code });
  } catch (e) {
    console.error("[referral/check] failed", e);
    return NextResponse.json({ valid: null, code });
  }
}
