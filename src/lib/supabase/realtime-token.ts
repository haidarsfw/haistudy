// Client-side cache for the realtime JWT minted by /api/auth/realtime-token.
// Provided to supabase-js as the `accessToken` callback so Realtime RLS can
// identify the user (license-key auth has no Supabase Auth session).
//
// Returns null when logged-out / preview / unconfigured — the client then
// connects as anon, which (after migration 044) receives no realtime rows.
//
// Failure back-off: supabase-js calls the accessToken callback ~every 60s on an
// active realtime connection. Without a negative cache, a logged-out/expired
// tab re-mints every minute and 401s forever — a real Vercel Active-CPU drain
// (it was the single busiest serverless endpoint in the logs). So after a
// failure we hold off before trying again: a long cooldown for 401/403 (no
// session → logged out) and a short one for transient network/5xx errors so a
// logged-in user's realtime recovers quickly.

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;
let nextRetryAt = 0; // ms epoch; skip network fetches until this time

const SKEW_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const AUTH_FAIL_COOLDOWN_MS = 10 * 60 * 1000; // 401/403 → logged out, back off hard
const TRANSIENT_COOLDOWN_MS = 30 * 1000; // network/5xx → likely transient, retry soon

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/realtime-token", { credentials: "include" });
    if (!res.ok) {
      cached = null;
      nextRetryAt =
        Date.now() +
        (res.status === 401 || res.status === 403
          ? AUTH_FAIL_COOLDOWN_MS
          : TRANSIENT_COOLDOWN_MS);
      return null;
    }
    const data = (await res.json()) as { token: string; expiresAt: number };
    cached = { token: data.token, expiresAt: data.expiresAt };
    nextRetryAt = 0;
    return data.token;
  } catch {
    cached = null;
    nextRetryAt = Date.now() + TRANSIENT_COOLDOWN_MS;
    return null;
  } finally {
    inflight = null;
  }
}

export async function getRealtimeToken(): Promise<string | null> {
  if (cached && cached.expiresAt - SKEW_MS > Date.now()) {
    return cached.token;
  }
  // Negative cache: after a recent failure, return null without hitting the
  // network (kills the every-60s 401 loop for logged-out/expired clients).
  if (Date.now() < nextRetryAt) return null;
  if (!inflight) inflight = fetchToken();
  return inflight;
}

export function clearRealtimeToken(): void {
  cached = null;
  inflight = null;
  nextRetryAt = 0; // reset the cooldown so a fresh login mints immediately
}
