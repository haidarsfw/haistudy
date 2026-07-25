import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  findAccountByEmail,
  readPasswordHashForLogin,
  touchLastLogin,
  wrongMethodMessage,
} from "@/lib/auth/account";
import { applyAccountCookie, createAccountSession } from "@/lib/auth/account-session";
import { verifyPassword } from "@/lib/auth/password";
import {
  checkServerRateLimit,
  recordLoginAttempt,
} from "@/lib/auth/server-rate-limit";
import {
  checkLoginLock,
  clearLoginFails,
  formatRetryAfter,
  recordLoginFail,
} from "@/lib/auth/account-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";
import { normalizeEmail } from "@/lib/auth/account";

const GENERIC = "Email atau password salah";

/**
 * Sign in to an ACCOUNT. This does not open the app — it establishes who you
 * are. Opening a purchased access is a separate, deliberate step.
 */
export async function POST(req: Request) {
  // scope-exempt: signing into an account happens before any scope is chosen.
  // Only the `accounts` layer is touched; no scoped table is read or written.
  const ip = getClientIp(req);

  const gate = await checkServerRateLimit(ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().slice(0, 120);
  const password = String(body.password ?? "").slice(0, 400);

  if (!email || !password) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
  }
  const supabase = createServerClient()!;
  const emailLower = normalizeEmail(email);

  // Per-account lockout: 3 wrong tries buys a minute, 6 buys five, 9 buys half
  // an hour. Checked before the address is even looked up, so this is also not
  // usable as a way to test which addresses exist.
  const lock = await checkLoginLock(supabase, emailLower);
  if (!lock.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan. Coba lagi ${formatRetryAfter(lock.retryAfter)}.`,
        code: "LOCKED",
        retryAfter: lock.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(lock.retryAfter) } }
    );
  }

  const account = await findAccountByEmail(supabase, email);

  if (!account) {
    await Promise.all([
      recordLoginAttempt(ip, "fail"),
      recordLoginFail(supabase, emailLower, ip),
    ]);
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  // Deliberate, and the one place we do confirm an address exists here.
  //
  // An account has exactly one sign-in method, fixed at registration. Someone
  // who signed up with Google and then types a password gets no password to
  // check, and answering "email atau password salah" makes them believe their
  // account is gone. Naming the real method is what Google, GitHub and every
  // other provider does; the cost is confirming that this address has an
  // account here, which is a trade worth making.
  const mismatch = wrongMethodMessage(account, "password");
  if (mismatch) {
    await recordLoginAttempt(ip, "fail");
    return NextResponse.json(
      { error: mismatch, code: "WRONG_METHOD", method: account.authProvider },
      { status: 403 }
    );
  }

  if (account.status === "blocked") {
    await recordLoginAttempt(ip, "fail");
    return NextResponse.json(
      { error: "Akun ini diblokir. Hubungi admin.", code: "BLOCKED" },
      { status: 403 }
    );
  }

  const hash = await readPasswordHashForLogin(supabase, account.id);
  if (!hash || !(await verifyPassword(password, hash))) {
    await Promise.all([
      recordLoginAttempt(ip, "fail"),
      recordLoginFail(supabase, emailLower, ip),
    ]);
    // Tell them how many tries are left before the door shuts, rather than
    // letting the lockout arrive as a surprise.
    const next = await checkLoginLock(supabase, emailLower);
    return NextResponse.json(
      next.allowed
        ? { error: GENERIC }
        : {
            error: `${GENERIC}. Terlalu banyak percobaan, coba lagi ${formatRetryAfter(next.retryAfter)}.`,
            code: "LOCKED",
            retryAfter: next.retryAfter,
          },
      { status: next.allowed ? 401 : 429 }
    );
  }

  const token = await createAccountSession(supabase, account.id, req);
  await touchLastLogin(supabase, account.id);
  // A correct password wipes the ladder — it exists for strangers, not for
  // someone who simply mistyped twice.
  await Promise.all([
    recordLoginAttempt(ip, "ok"),
    clearLoginFails(supabase, emailLower),
  ]);

  const res = NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      nickname: account.nickname,
      authProvider: account.authProvider,
      emailVerified: Boolean(account.emailVerifiedAt),
    },
  });
  return applyAccountCookie(res, token);
}
