import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseAuthConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "TODO" &&
    supabaseAnonKey !== "TODO"
);

/**
 * SSR Supabase client wired to Next's cookie store.
 * Used by the OAuth callback to exchange the auth code and read the
 * authenticated user. Distinct from the service_role client in `server.ts`.
 */
export async function createServerAuthClient() {
  if (!isSupabaseAuthConfigured) return null;
  const cookieStore = await cookies();
  return createSSRServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        for (const item of items) {
          try {
            cookieStore.set(item.name, item.value, item.options);
          } catch {
            // Route handler cookies() may be read-only in some contexts;
            // ignore — Supabase tolerates this for read-after-write.
          }
        }
      },
    },
  });
}
