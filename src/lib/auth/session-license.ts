import { cookies } from "next/headers";

/**
 * Caller identity derived from httpOnly cookies. The `hs-session` cookie value
 * IS the caller's license key (see auth/session.ts); `hs-admin=1` marks admins.
 *
 * Use this for user-keyed routes (profile, settings, referral, ...) instead of
 * trusting a `licenseKey` from the request body/query — otherwise any logged-in
 * user can read/write another user's data (IDOR), since service_role bypasses RLS.
 */
export async function getCaller(): Promise<{ licenseKey: string; isAdmin: boolean } | null> {
  const jar = await cookies();
  const licenseKey = (jar.get("hs-session")?.value ?? "").toUpperCase();
  if (!licenseKey) return null;
  return { licenseKey, isAdmin: jar.get("hs-admin")?.value === "1" };
}
