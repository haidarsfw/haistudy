import { createBrowserClient } from "@supabase/ssr";
import { getRealtimeToken } from "./realtime-token";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "TODO" &&
    supabaseAnonKey !== "TODO"
);

/**
 * Browser-side Supabase client using anon key.
 * Used for real-time subscriptions and authenticated reads.
 * Returns null if Supabase is not configured (safe no-op pattern).
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    // BYO auth: license-key sessions have no Supabase Auth, so provide the
    // realtime JWT (license_key + scope claims) for REST + Realtime. Falls back
    // to the anon key when logged-out/preview (no realtime rows after mig 044).
    accessToken: async () => (await getRealtimeToken()) ?? supabaseAnonKey!,
  });
}

/**
 * Browser-side Supabase client for AUTH ONLY (Google OAuth sign-in).
 *
 * MUST NOT set the `accessToken` option: supabase-js disables every `auth.*`
 * method (including `signInWithOAuth`) when `accessToken` is provided (it
 * throws "Supabase Client is configured with the accessToken option..."). It
 * also avoids the realtime-token fetch (the `accessToken` callback), so the
 * logged-out login page never hits /api/auth/realtime-token (401).
 *
 * Uses the default cookie storage so the PKCE code verifier is written for the
 * server callback (/auth/callback → createServerAuthClient) to exchange.
 * Returns null if Supabase is not configured (safe no-op pattern).
 *
 * `isSingleton: false` is REQUIRED: @supabase/ssr's createBrowserClient caches a
 * single browser instance and returns it (ignoring options) on every later call.
 * Since the realtime createClient() above is usually created first WITH
 * accessToken, a default call here would hand back that same accessToken client
 * and signInWithOAuth would throw. Forcing a non-singleton instance guarantees a
 * clean, accessToken-free client regardless of call order.
 */
export function createAuthClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, { isSingleton: false });
}
