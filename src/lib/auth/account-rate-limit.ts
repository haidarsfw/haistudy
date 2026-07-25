// ============================================
// Guardrails for the abusable account actions
// ============================================
//
// Three things here can be hammered: guessing a password, making us send a
// reset mail, and making us send a verification mail. Each gets a limit, and
// every count lives in the database — a limit kept in localStorage is undone
// by clearing the browser, which is exactly what someone abusing it would do.
//
// What each limit is counted PER matters as much as the number:
//
//   wrong password  -> per ACCOUNT. Keying on IP would put a whole campus
//                      behind one counter, so three fumbled logins in a
//                      lecture hall would lock out everyone else.
//   reset e-mail    -> per address AND per network. One address alone can't be
//                      spammed, and one machine can't work through a list.
//   verify e-mail   -> per account.
//
// Everything fails OPEN. If the database hiccups, people get in; they do not
// get locked out of their own account by an outage.

import type { SupabaseClient } from "@supabase/supabase-js";

export type RateKind = "login_fail" | "reset_request" | "verify_resend";

export interface RateDecision {
  allowed: boolean;
  /** Seconds until the caller may try again. 0 when allowed. */
  retryAfter: number;
}

const ALLOW: RateDecision = { allowed: true, retryAfter: 0 };

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Same ladder the old client-side limiter used, now enforced where it cannot
// be wiped: 3 wrong tries buys a minute, 6 buys five, 9 buys half an hour.
const LOGIN_TIERS = [
  { fails: 9, lockMs: 30 * MIN },
  { fails: 6, lockMs: 5 * MIN },
  { fails: 3, lockMs: 1 * MIN },
];
const LOGIN_WINDOW = 30 * MIN;

const RESET_PER_EMAIL = { max: 3, windowMs: HOUR };
const RESET_PER_IP = { max: 10, windowMs: HOUR };
const VERIFY_PER_ACCOUNT = { max: 5, windowMs: DAY };

interface Counted {
  count: number;
  lastAt: number | null;
}

async function countSince(
  supabase: SupabaseClient,
  kind: RateKind,
  subject: string,
  windowMs: number
): Promise<Counted | null> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("account_rate_events")
    .select("created_at")
    .eq("kind", kind)
    .eq("subject", subject)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return null;
  return {
    count: data.length,
    lastAt: data[0] ? new Date(data[0].created_at).getTime() : null,
  };
}

export async function recordRateEvent(
  supabase: SupabaseClient,
  kind: RateKind,
  subject: string,
  ip?: string | null
): Promise<void> {
  try {
    await supabase.from("account_rate_events").insert({
      kind,
      subject: subject.slice(0, 200),
      ip: ip?.slice(0, 64) ?? null,
    });
  } catch (e) {
    // A limiter that throws would take down the thing it is protecting.
    console.error("[rate] insert failed", e);
  }
}

/** Is this account currently locked out from password attempts? */
export async function checkLoginLock(
  supabase: SupabaseClient,
  emailLower: string
): Promise<RateDecision> {
  const counted = await countSince(supabase, "login_fail", emailLower, LOGIN_WINDOW);
  if (!counted || counted.count === 0 || !counted.lastAt) return ALLOW;

  const tier = LOGIN_TIERS.find((t) => counted.count >= t.fails);
  if (!tier) return ALLOW;

  // The clock runs from the most recent failure, so hammering it keeps
  // pushing the door further away rather than waiting it out while trying.
  const until = counted.lastAt + tier.lockMs;
  const remaining = until - Date.now();
  if (remaining <= 0) return ALLOW;

  return { allowed: false, retryAfter: Math.ceil(remaining / 1000) };
}

export async function recordLoginFail(
  supabase: SupabaseClient,
  emailLower: string,
  ip?: string | null
): Promise<void> {
  await recordRateEvent(supabase, "login_fail", emailLower, ip);
}

/** A correct password wipes the slate — the ladder is for strangers. */
export async function clearLoginFails(
  supabase: SupabaseClient,
  emailLower: string
): Promise<void> {
  try {
    await supabase
      .from("account_rate_events")
      .delete()
      .eq("kind", "login_fail")
      .eq("subject", emailLower);
  } catch {
    /* non-critical */
  }
}

/**
 * May we send another reset mail?
 *
 * Checked BEFORE we look the address up, so the limit applies to unknown
 * addresses too. Without that, the honest "belum ada akun dengan email ini"
 * reply would be a free tool for working out which addresses have accounts.
 */
export async function checkResetQuota(
  supabase: SupabaseClient,
  emailLower: string,
  ip: string
): Promise<RateDecision> {
  const [byEmail, byIp] = await Promise.all([
    countSince(supabase, "reset_request", emailLower, RESET_PER_EMAIL.windowMs),
    ip && ip !== "unknown"
      ? countSince(supabase, "reset_request", `ip:${ip}`, RESET_PER_IP.windowMs)
      : Promise.resolve(null),
  ]);

  if (byEmail && byEmail.count >= RESET_PER_EMAIL.max && byEmail.lastAt) {
    const until = byEmail.lastAt + RESET_PER_EMAIL.windowMs;
    return {
      allowed: false,
      retryAfter: Math.max(60, Math.ceil((until - Date.now()) / 1000)),
    };
  }
  if (byIp && byIp.count >= RESET_PER_IP.max && byIp.lastAt) {
    const until = byIp.lastAt + RESET_PER_IP.windowMs;
    return {
      allowed: false,
      retryAfter: Math.max(60, Math.ceil((until - Date.now()) / 1000)),
    };
  }
  return ALLOW;
}

/** Counted for every attempt, found or not — see checkResetQuota. */
export async function recordResetRequest(
  supabase: SupabaseClient,
  emailLower: string,
  ip: string
): Promise<void> {
  await recordRateEvent(supabase, "reset_request", emailLower, ip);
  if (ip && ip !== "unknown") {
    await recordRateEvent(supabase, "reset_request", `ip:${ip}`, ip);
  }
}

export async function checkVerifyResendQuota(
  supabase: SupabaseClient,
  accountId: string
): Promise<RateDecision> {
  const counted = await countSince(
    supabase,
    "verify_resend",
    accountId,
    VERIFY_PER_ACCOUNT.windowMs
  );
  if (!counted || counted.count < VERIFY_PER_ACCOUNT.max || !counted.lastAt) {
    return ALLOW;
  }
  const until = counted.lastAt + VERIFY_PER_ACCOUNT.windowMs;
  return {
    allowed: false,
    retryAfter: Math.max(60, Math.ceil((until - Date.now()) / 1000)),
  };
}

export async function recordVerifyResend(
  supabase: SupabaseClient,
  accountId: string,
  ip?: string | null
): Promise<void> {
  await recordRateEvent(supabase, "verify_resend", accountId, ip);
}

/** "3 menit lagi" / "45 detik lagi" — for a message a human reads. */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) return `${seconds} detik lagi`;
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} menit lagi`;
  return `${Math.ceil(mins / 60)} jam lagi`;
}
