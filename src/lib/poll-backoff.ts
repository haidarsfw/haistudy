// Lightweight failure backoff for interval polls that hit serverless routes.
//
// The interval timer keeps ticking, but after consecutive failures the poll
// SKIPS runs until a growing cooldown elapses — so a route that starts
// 401/500-ing can never be hammered every tick (a Vercel-invocation + DB-write
// guard). The first success resets it. Mirrors the negative-cache backoff
// already used for the realtime-token mint.
//
// Usage:
//   const backoff = createPollBackoff(45_000);
//   const tick = async () => {
//     if (!backoff.shouldRun()) return;      // in cooldown → skip this tick
//     try {
//       const res = await fetch(url);
//       if (!res.ok) { backoff.onFailure(); return; }
//       ...use data...
//       backoff.onSuccess();
//     } catch { backoff.onFailure(); }
//   };

export interface PollBackoff {
  /** True if a poll may run now; false while cooling down after failures. */
  shouldRun(): boolean;
  onSuccess(): void;
  onFailure(): void;
}

export function createPollBackoff(baseMs: number, maxMs = 10 * 60_000): PollBackoff {
  let failures = 0;
  let nextAllowed = 0;
  return {
    shouldRun() {
      return Date.now() >= nextAllowed;
    },
    onSuccess() {
      failures = 0;
      nextAllowed = 0;
    },
    onFailure() {
      failures += 1;
      // base * 2^failures, capped (e.g. 45s → 90s, 180s, 360s … ≤ 10 min).
      const delay = Math.min(baseMs * 2 ** failures, maxMs);
      nextAllowed = Date.now() + delay;
    },
  };
}
