import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { EMAIL_RE, findAccountByEmail, normalizeEmail } from "@/lib/auth/account";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { sendPasswordResetEmail } from "@/lib/notifications/account-email";
import {
  checkResetQuota,
  formatRetryAfter,
  recordResetRequest,
} from "@/lib/auth/account-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * Ask for a reset link.
 *
 * This used to answer identically for every address so the form could not be
 * used to work out which e-mails have accounts here. That protection was
 * traded away deliberately: someone who mistypes their address then waits for
 * a mail that will never arrive is a support message and a lost customer, and
 * a vague reply helps nobody who is honest.
 *
 * The trade is paid for with the quota instead. Every attempt is counted
 * whether or not the address exists — 3 per hour per address, 10 per hour per
 * network — so the honest answer cannot be turned into a tool for walking a
 * list of e-mails. The count happens BEFORE the lookup for exactly that
 * reason.
 */
export async function POST(req: Request) {
  // scope-exempt: password reset belongs to the account layer, which has no
  // scope columns and no scoped reads.
  const ip = getClientIp(req);

  let email = "";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    email = String(body.email ?? "").trim().slice(0, 120);
  } catch {
    /* handled by the validity check below */
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Format emailnya belum benar", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
  }
  const supabase = createServerClient()!;
  const emailLower = normalizeEmail(email);

  const quota = await checkResetQuota(supabase, emailLower, ip);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Terlalu banyak permintaan. Coba lagi ${formatRetryAfter(quota.retryAfter)}.`,
        code: "RATE_LIMITED",
        retryAfter: quota.retryAfter,
      },
      { status: 429, headers: { "Retry-After": String(quota.retryAfter) } }
    );
  }

  // Counted before we know whether the address exists, so a miss costs the
  // same as a hit.
  await recordResetRequest(supabase, emailLower, ip);

  const account = await findAccountByEmail(supabase, email);

  if (!account) {
    return NextResponse.json(
      { error: "Belum ada akun dengan email ini.", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (account.authProvider === "google") {
    return NextResponse.json(
      {
        error: "Akun ini masuk lewat Google, jadi tidak punya password.",
        code: "GOOGLE_ACCOUNT",
      },
      { status: 409 }
    );
  }

  if (account.status === "blocked") {
    return NextResponse.json(
      { error: "Akun ini diblokir. Hubungi admin.", code: "BLOCKED" },
      { status: 403 }
    );
  }

  // Sending is the slow part and nothing downstream waits on it.
  waitUntil(
    (async () => {
      try {
        const token = await issueAccountToken(supabase, account.id, "reset", ip);
        await sendPasswordResetEmail({
          to: account.email,
          name: account.nickname || account.fullName,
          token,
        });
      } catch (e) {
        console.error("[account/password/forgot] send failed", e);
      }
    })()
  );

  return NextResponse.json({ ok: true, code: "SENT", email: account.email });
}
