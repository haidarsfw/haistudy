import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  clearAccountCookie,
  revokeCurrentAccountSession,
} from "@/lib/auth/account-session";

const CLEARED = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

/**
 * Sign out of the account.
 *
 * Also clears the access cookies. Someone who presses "Keluar" means all of
 * it; leaving `hs-session` behind would drop them out of their account while
 * the app still let them in, which reads as a bug and is a real risk on a
 * shared laptop.
 *
 * Always answers 200. A logout that fails loudly leaves people stuck on a
 * page they are trying to leave.
 */
export async function POST() {
  // scope-exempt: clears cookies and revokes one account session row. Reads
  // nothing scoped.
  const res = NextResponse.json({ ok: true });

  try {
    if (isSupabaseServerConfigured) {
      await revokeCurrentAccountSession(createServerClient()!);
    }
  } catch (e) {
    console.error("[account/logout] revoke failed", e);
  }

  clearAccountCookie(res);
  res.cookies.set("hs-session", "", CLEARED);
  res.cookies.set("hs-scope", "", CLEARED);
  res.cookies.set("hs-admin", "", CLEARED);

  return res;
}
