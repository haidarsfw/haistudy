// ============================================
// In-memory per-instance cooldown for expensive / paid endpoints.
// ============================================
// Keyed by `${bucket}:${identity}`. Zero added DB reads/writes — purely an
// in-process Map. Serverless instances are reused (Fluid Compute) so this
// throttles realistic rapid-fire abuse (a user spamming "Nilai Ulang", a loop
// hammering AI chat). It is a COST guard, NOT a security control: a determined
// attacker spread across cold instances can bypass it. That trade-off is
// deliberate — a DB-backed limiter would add reads on every call, which the
// no-cost-increase constraint forbids.
//
// IMPORTANT: this only gates how often a request may START. It never touches
// the work itself — once a grade/chat begins it runs to completion in full.

export interface CooldownResult {
  allowed: boolean;
  /** Seconds until the next call is allowed (0 when allowed now). */
  retryAfter: number;
}

const lastHit = new Map<string, number>(); // key → last-allowed epoch ms
let lastPrune = 0;

function prune(now: number): void {
  // Sweep entries older than 10 min, at most once every 5 min, so the map
  // can't grow unbounded on a long-lived warm instance.
  if (now - lastPrune < 300_000) return;
  lastPrune = now;
  for (const [k, t] of lastHit) {
    if (now - t > 600_000) lastHit.delete(k);
  }
}

/**
 * Returns { allowed:false, retryAfter } when `key` was last allowed less than
 * `windowMs` ago. Otherwise records "now" as the last hit and returns
 * { allowed:true, retryAfter:0 }.
 */
export function checkCooldown(key: string, windowMs: number): CooldownResult {
  const now = Date.now();
  prune(now);
  const last = lastHit.get(key);
  if (last !== undefined && now - last < windowMs) {
    return {
      allowed: false,
      retryAfter: Math.ceil((windowMs - (now - last)) / 1000),
    };
  }
  lastHit.set(key, now);
  return { allowed: true, retryAfter: 0 };
}
