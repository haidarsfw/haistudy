import { cookies } from "next/headers";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

/**
 * Validate that the current request is from an authenticated admin.
 * Checks hs-session + hs-admin cookies, then verifies against database.
 */
export async function validateAdmin(): Promise<{
  authorized: boolean;
  licenseKey: string | null;
}> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("hs-session");

  // hs-session is the only required cookie. If it's gone, proxy.ts already
  // redirects /admin → /login, so this path is for API calls only.
  if (!sessionCookie?.value) {
    return { authorized: false, licenseKey: null };
  }
  const key = sessionCookie.value.trim().toUpperCase();

  // DB is_admin is the source of truth — NOT the hs-admin cookie. A dropped /
  // expired hs-admin cookie used to blank the whole panel even though the user
  // was still a valid admin; relying on the DB flag here removes that failure
  // mode. .maybeSingle() (not .single()) so a 0-row lookup returns cleanly.
  if (isSupabaseServerConfigured) {
    const supabase = createServerClient()!;
    const { data } = await supabase
      .from("license_keys")
      .select("is_admin")
      .eq("key", key)
      .maybeSingle();

    return { authorized: Boolean(data?.is_admin), licenseKey: key };
  }

  // Dev/mock (no Supabase): fall back to the hs-admin cookie hint.
  const adminCookie = cookieStore.get("hs-admin");
  return { authorized: adminCookie?.value === "1", licenseKey: key };
}

/**
 * Check if the current request has a valid admin cookie (lightweight, no DB).
 */
export async function isAdminFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("hs-admin")?.value === "1";
}
