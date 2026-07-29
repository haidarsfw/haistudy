import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { sendDeleteRequestEmail } from "@/lib/notifications/account-email";
import {
  checkDeleteRequestQuota,
  formatRetryAfter,
  recordDeleteRequest,
} from "@/lib/auth/account-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * ASK to delete the account. Nothing is deleted here.
 *
 * Two gates, and they check different things.
 *
 * Typing your own e-mail address proves you know whose account this is. It
 * replaced a fixed phrase ("HAPUS AKUN SAYA") which anyone holding a borrowed
 * session could copy off the screen — it proved someone could read, not that
 * they had any business being there.
 *
 * The mail then proves the request came from the mailbox that owns the account,
 * which is the only thing that actually establishes ownership. Nothing is
 * scheduled until that link is clicked.
 *
 * Having live paid access no longer blocks anything. It used to, and the effect
 * was that the people with the most at stake were the only ones who could not
 * do this themselves and had to go and find the admin. The seven-day window
 * exists precisely so that having something to lose is survivable.
 */
export async function POST(req: Request) {
  // scope-exempt: acts on the caller's own account row. Scoped content is
  // reached through licences, which this route does not touch.
  try {
    const account = await requireAccount();

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let typed = "";
    try {
      const body = (await req.json()) as Record<string, unknown>;
      typed = String(body.email ?? "").trim();
    } catch {
      /* handled by the match below */
    }

    if (typed.toLowerCase() !== account.emailLower) {
      return NextResponse.json(
        { error: "Emailnya belum cocok dengan email akun ini", code: "BAD_EMAIL" },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;

    // Already scheduled. Say so rather than sending a second identical mail —
    // the cancel link they already have is the thing they need.
    if (account.deletionRequestedAt) {
      return NextResponse.json(
        {
          error: "Penghapusan akun ini sudah dijadwalkan. Cek emailmu untuk membatalkannya.",
          code: "ALREADY_SCHEDULED",
        },
        { status: 409 }
      );
    }

    const quota = await checkDeleteRequestQuota(supabase, account.id);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Sudah terlalu sering. Coba lagi ${formatRetryAfter(quota.retryAfter)}.`,
        },
        { status: 429, headers: { "Retry-After": String(quota.retryAfter) } }
      );
    }

    const ip = getClientIp(req);
    await recordDeleteRequest(supabase, account.id, ip);

    // Off the critical path. The user is told the mail is on its way either
    // way; a slow mail provider must not make this look like a failure and
    // invite a second press.
    waitUntil(
      (async () => {
        try {
          const token = await issueAccountToken(supabase, account.id, "delete", ip);
          await sendDeleteRequestEmail({
            to: account.email,
            name: account.nickname || account.fullName,
            token,
          });
        } catch (e) {
          console.error("[account/delete] request mail failed", e);
        }
      })()
    );

    return NextResponse.json({ ok: true, sentTo: account.email });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/delete] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
