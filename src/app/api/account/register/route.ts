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
import {
  attachReferral,
  lookupReferralCode,
  mintAccountReferralCode,
  normalizeReferralCode,
} from "@/lib/referral/codes";

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
  const referralCode = normalizeReferralCode(String(body.referralCode ?? ""));

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email tidak valid", field: "email" }, { status: 400 });
  }
  // Name is optional here on purpose. Signup asks for exactly what Google
  // hands over, and the real name is collected once at the first checkout.
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

  // The authoritative check. The form checks as you type, but a form can be
  // skipped entirely, so an unknown code has to die here too.
  //
  // A LOOKUP FAILURE IS NOT A REJECTION. If the table is unreachable the code
  // is dropped and the signup continues — losing a referral we cannot verify
  // costs us a row; refusing to create the account costs us the customer.
  let resolvedReferral: string | null = null;
  if (referralCode) {
    try {
      const found = await lookupReferralCode(supabase, referralCode);
      if (!found) {
        return NextResponse.json(
          {
            error: `Kode ${referralCode} tidak kami kenali. Cek lagi, atau lanjut tanpa kode.`,
            field: "referralCode",
            code: "REFERRAL_UNKNOWN",
          },
          { status: 400 }
        );
      }
      resolvedReferral = found.code;
    } catch (e) {
      console.error("[account/register] referral lookup failed, continuing", e);
    }
  }

  const account = await createAccount(supabase, {
    email,
    authProvider: "password",
    passwordHash: await hashPassword(password),
    emailVerified: false,
    fullName,
    nickname: nickname || fullName.split(" ")[0] || "",
    whatsapp,
    referralCode,
  });


  if (!account) {
    return NextResponse.json(
      { error: "Email ini sudah punya akun. Masuk saja.", field: "email", code: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  // Their own code, and the link back to whoever sent them. Both off the
  // critical path: a signup must not fail because a referral row did not
  // insert, and the code can always be minted later when /account asks for it.
  waitUntil(
    (async () => {
      try {
        await mintAccountReferralCode(supabase, account.id);
        if (resolvedReferral) await attachReferral(supabase, account.id, resolvedReferral);
      } catch (e) {
        console.error("[account/register] referral setup failed", e);
      }
    })()
  );

  // Awaited, not fired and forgotten.
  //
  // This mail used to ride on waitUntil, which was the right call when
  // confirming was optional. It is not optional any more: an order cannot be
  // approved until the address is confirmed, so a mail that quietly never
  // leaves is a buyer who cannot be served. Roughly 300ms, once per account,
  // in exchange for knowing whether it went.
  //
  // Still never fatal. The account exists; if the mail failed the person can
  // ask for another from the account page, and the invoice mail carries a
  // fresh link of its own. The response says which way it went so the signup
  // screen can be honest rather than promising a mail that is not coming.
  let verifyMailSent = false;
  try {
    const token = await issueAccountToken(supabase, account.id, "verify", ip);
    const res = await sendVerifyEmail({
      to: account.email,
      name: account.nickname || account.fullName,
      token,
    });
    verifyMailSent = res.ok;
  } catch (e) {
    console.error("[account/register] verify mail failed", e);
  }

  const token = await createAccountSession(supabase, account.id, req);
  await recordLoginAttempt(ip, "ok");

  const res = NextResponse.json({
    ok: true,
    // False means the confirmation mail did not go out. The account is fine;
    // the screen should offer "kirim ulang" rather than say it has been sent.
    verifyMailSent,
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
