// Client-side cache for the realtime JWT minted by /api/auth/realtime-token.
// Provided to supabase-js as the `accessToken` callback so Realtime RLS can
// identify the user (license-key auth has no Supabase Auth session).
//
// Returns null when logged-out / preview / unconfigured — the client then
// connects as anon, which (after migration 044) receives no realtime rows.

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string | null> | null = null;

const SKEW_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function fetchToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/realtime-token", { credentials: "include" });
    if (!res.ok) {
      cached = null;
      return null;
    }
    const data = (await res.json()) as { token: string; expiresAt: number };
    cached = { token: data.token, expiresAt: data.expiresAt };
    return data.token;
  } catch {
    cached = null;
    return null;
  } finally {
    inflight = null;
  }
}

export async function getRealtimeToken(): Promise<string | null> {
  if (cached && cached.expiresAt - SKEW_MS > Date.now()) {
    return cached.token;
  }
  if (!inflight) inflight = fetchToken();
  return inflight;
}

export function clearRealtimeToken(): void {
  cached = null;
  inflight = null;
}
