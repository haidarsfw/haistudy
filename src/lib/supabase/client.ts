import { createBrowserClient } from "@supabase/ssr";

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

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
