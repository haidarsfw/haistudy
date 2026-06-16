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
