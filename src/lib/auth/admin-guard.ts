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
  const adminCookie = cookieStore.get("hs-admin");

  if (!sessionCookie?.value || adminCookie?.value !== "1") {
    return { authorized: false, licenseKey: null };
  }

  // Double-check against database when Supabase is configured
  if (isSupabaseServerConfigured) {
    const supabase = createServerClient()!;
    const { data } = await supabase
      .from("license_keys")
      .select("is_admin")
      .eq("key", sessionCookie.value)
      .single();

    if (!data?.is_admin) {
      return { authorized: false, licenseKey: sessionCookie.value };
    }
  }

  return { authorized: true, licenseKey: sessionCookie.value };
}

/**
 * Check if the current request has a valid admin cookie (lightweight, no DB).
 */
export async function isAdminFromCookies(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("hs-admin")?.value === "1";
}
