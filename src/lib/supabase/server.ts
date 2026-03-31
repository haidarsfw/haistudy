import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseServerConfigured = Boolean(
  supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl !== "TODO" &&
    supabaseServiceKey !== "TODO"
);

/**
 * Server-side Supabase client using service_role key.
 * Used in API routes for all write operations.
 * Bypasses RLS - only use in trusted server-side code.
 * Returns null if Supabase is not configured.
 */
export function createServerClient() {
  if (!isSupabaseServerConfigured) {
    return null;
  }

  return createSupabaseClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
