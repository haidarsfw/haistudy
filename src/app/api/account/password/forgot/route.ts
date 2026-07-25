import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { EMAIL_RE, findAccountByEmail } from "@/lib/auth/account";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { sendPasswordResetEmail } from "@/lib/notifications/account-email";
import { checkServerRateLimit } from "@/lib/auth/server-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * Ask for a reset link.
 *
 * Always answers 200 with the same body, whether or not the address exists.
 * Anything else turns this endpoint into a way to test which e-mails have
 * accounts here.
 *
 * A Google account gets no mail — there is no password to reset. The page copy
 * covers that case ("kalau akunmu pakai Google, masuk lewat tombol Google")
 * rather than the response, which would give the same enumeration away.
 */
export async function POST(req: Request) {
  // scope-exempt: password reset belongs to the account layer, which has no
  // scope columns and no scoped reads.
  const ip = getClientIp(req);

  const gate = await checkServerRateLimit(ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let email = "";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    email = String(body.email ?? "").trim().slice(0, 120);
  } catch {
    /* handled by the validity check below */
  }

  const ok = NextResponse.json({ ok: true });

  if (!EMAIL_RE.test(email) || !isSupabaseServerConfigured) return ok;

  const supabase = createServerClient()!;

  waitUntil(
    (async () => {
      try {
        const account = await findAccountByEmail(supabase, email);
        if (!account) return;
        if (account.authProvider !== "password") return;
        if (account.status === "blocked") return;

        const token = await issueAccountToken(supabase, account.id, "reset", ip);
        await sendPasswordResetEmail({
          to: account.email,
          name: account.nickname || account.fullName,
          token,
        });
      } catch (e) {
        console.error("[account/password/forgot] failed", e);
      }
    })()
  );

  return ok;
}
