import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  EMAIL_RE,
  createAccount,
  findAccountByEmail,
  normalizeEmail,
  wrongMethodMessage,
} from "@/lib/auth/account";
import { applyAccountCookie, createAccountSession } from "@/lib/auth/account-session";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { sendVerifyEmail } from "@/lib/notifications/account-email";
import {
  checkServerRateLimit,
  recordLoginAttempt,
} from "@/lib/auth/server-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * Create an account with e-mail + password.
 *
 * Registration does NOT grant access to anything. It creates an identity; the
 * buyer then goes on to checkout, and access is attached to this account when
 * the purchase is approved. That separation is the whole point: the next exam
 * period is a second purchase on the same account, not a second identity.
 *
 */
export async function POST(req: Request) {
  // scope-exempt: an account is created before any scope exists. This route
  // reads and writes only the `accounts` layer, which has no scope columns and
  // grants no access to scoped content.
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
  // Never trimmed: a leading or trailing space is a legitimate part of a
  // password, and silently eating it would lock the user out of their own
  // account on the next sign-in.
  const password = String(body.password ?? "").slice(0, 400);
  const fullName = String(body.fullName ?? "").trim().slice(0, 100);
  const nickname = String(body.nickname ?? "").trim().slice(0, 24);
  const whatsapp = String(body.whatsapp ?? "").trim().slice(0, 30);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email tidak valid", field: "email" }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json(
      { error: "Nama wajib diisi", field: "fullName" },
      { status: 400 }
    );
  }
  const pwProblem = validatePassword(password);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem, field: "password" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
  }
  const supabase = createServerClient()!;

  // Friendly pre-check. The unique index is still the real arbiter below, so a
  // race between two simultaneous signups cannot create a duplicate.
  const existing = await findAccountByEmail(supabase, email);
  if (existing) {
    return NextResponse.json(
      {
        error:
          wrongMethodMessage(existing, "password") ??
          "Email ini sudah punya akun. Masuk saja.",
        field: "email",
        code: "EMAIL_TAKEN",
      },
      { status: 409 }
    );
  }

  const account = await createAccount(supabase, {
    email,
    authProvider: "password",
    passwordHash: await hashPassword(password),
    emailVerified: false,
    fullName,
    nickname: nickname || fullName.split(" ")[0] || "",
    whatsapp,
  });

  if (!account) {
    return NextResponse.json(
      { error: "Email ini sudah punya akun. Masuk saja.", field: "email", code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  // Verification never blocks anything: the account is usable immediately and
  // the account page simply shows an unverified badge until the link is
  // clicked. Blocking here would strand a buyer at 2am behind a mail queue.
  waitUntil(
    (async () => {
      try {
        const token = await issueAccountToken(supabase, account.id, "verify", ip);
        await sendVerifyEmail({
          to: account.email,
          name: account.nickname || account.fullName,
          token,
        });
      } catch (e) {
        console.error("[account/register] verify mail failed", e);
      }
    })()
  );

  const token = await createAccountSession(supabase, account.id, req);
  await recordLoginAttempt(ip, "ok");

  const res = NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      nickname: account.nickname,
      authProvider: account.authProvider,
      emailVerified: false,
    },
  });
  return applyAccountCookie(res, token);
}
