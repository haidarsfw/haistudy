// ============================================
// Server-side rate limiter for /api/auth/validate
// ============================================
// Critical: 5-char license keys = ~28M combos. Without throttling,
// brute-force is feasible (~14h per key with 1000 active licenses).
//
// Limits per IP:
//   - 10 attempts per 5 min → 429 with Retry-After header
//   - 50 attempts per 1 hour → 30-min cooldown
//   - 200 attempts per 24h → soft-ban (log to error_logs)
//
// Storage: scope_login_attempts table. Weekly cleanup deletes rows > 30d.

import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

export interface RateLimitDecision {
  allowed: boolean;
  retryAfter: number; // seconds, 0 when allowed
  reason?: string;
}

const WINDOW_5MIN_SEC = 5 * 60;
const WINDOW_1H_SEC = 60 * 60;
const WINDOW_24H_SEC = 24 * 60 * 60;

const LIMIT_5MIN = 10;
const LIMIT_1H = 50;
const LIMIT_24H = 200;

const COOLDOWN_30MIN_SEC = 30 * 60;
const COOLDOWN_24H_SEC = 24 * 60 * 60;

/**
 * Pre-flight check before /api/auth/validate handles the request.
 * Returns allowed=false with retryAfter when over any limit.
 */
export async function checkServerRateLimit(ip: string): Promise<RateLimitDecision> {
  if (!ip || ip === "unknown") {
    // No IP → can't enforce; allow (proxy/CDN should always provide one).
    return { allowed: true, retryAfter: 0 };
  }

  if (!isSupabaseServerConfigured) {
    // Dev mode without Supabase → skip enforcement.
    return { allowed: true, retryAfter: 0 };
  }

  const supabase = createServerClient()!;
  const now = new Date();

  // Query attempt counts for the three windows in one round-trip.
  const since24h = new Date(now.getTime() - WINDOW_24H_SEC * 1000).toISOString();
  const since1h = new Date(now.getTime() - WINDOW_1H_SEC * 1000).toISOString();
  const since5m = new Date(now.getTime() - WINDOW_5MIN_SEC * 1000).toISOString();

  const { data, error } = await supabase
    .from("scope_login_attempts")
    .select("attempted_at, outcome")
    .eq("ip", ip)
    .gte("attempted_at", since24h)
    .order("attempted_at", { ascending: false })
    .limit(LIMIT_24H + 1);

  if (error || !data) {
    // Fail open - don't lock out users on storage hiccup. Log and allow.
    console.error("[rate-limit] query failed", error);
    return { allowed: true, retryAfter: 0 };
  }

  const fails = data.filter((r) => r.outcome === "fail");
  const fails24h = fails.length;
  const fails1h = fails.filter((r) => r.attempted_at >= since1h).length;
  const fails5m = fails.filter((r) => r.attempted_at >= since5m).length;

  if (fails24h >= LIMIT_24H) {
    return { allowed: false, retryAfter: COOLDOWN_24H_SEC, reason: "24h-ban" };
  }
  if (fails1h >= LIMIT_1H) {
    return { allowed: false, retryAfter: COOLDOWN_30MIN_SEC, reason: "1h-cooldown" };
  }
  if (fails5m >= LIMIT_5MIN) {
    return { allowed: false, retryAfter: WINDOW_5MIN_SEC, reason: "5m-throttle" };
  }

  return { allowed: true, retryAfter: 0 };
}

/**
 * Log an attempt after the validate handler resolves. Outcome 'ok'/'fail'
 * feeds the rate-limit window query.
 */
export async function recordLoginAttempt(
  ip: string,
  outcome: "ok" | "fail"
): Promise<void> {
  if (!ip || ip === "unknown") return;
  if (!isSupabaseServerConfigured) return;

  const supabase = createServerClient()!;
  await supabase
    .from("scope_login_attempts")
    .insert({ ip, outcome })
    .then(undefined, (e) => {
      console.error("[rate-limit] insert failed", e);
    });
}

/**
 * Returns whether a Cloudflare Turnstile token is required for this IP.
 * Active after 3+ recent fails - defense in depth on top of rate limit.
 */
export async function isCaptchaRequired(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  if (!isSupabaseServerConfigured) return false;

  const supabase = createServerClient()!;
  const since1h = new Date(Date.now() - WINDOW_1H_SEC * 1000).toISOString();

  const { count } = await supabase
    .from("scope_login_attempts")
    .select("attempted_at", { head: true, count: "exact" })
    .eq("ip", ip)
    .eq("outcome", "fail")
    .gte("attempted_at", since1h);

  return (count ?? 0) >= 3;
}
