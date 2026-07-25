import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";
import { issueAccountToken } from "@/lib/auth/account-tokens";
import { sendVerifyEmail } from "@/lib/notifications/account-email";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

// Long enough that a double-click or an impatient second press costs nothing,
// short enough that nobody feels stuck waiting.
const COOLDOWN_MS = 2 * 60 * 1000;

/** Send the verification mail again. */
export async function POST(req: Request) {
  // scope-exempt: account layer only.
  try {
    const account = await requireAccount();

    if (account.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    const supabase = createServerClient()!;

    const { data: recent } = await supabase
      .from("account_tokens")
      .select("created_at")
      .eq("account_id", account.id)
      .eq("purpose", "verify")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.created_at) {
      const elapsed = Date.now() - new Date(recent.created_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        return NextResponse.json(
          {
            error: "Emailnya baru saja dikirim. Coba lagi sebentar.",
            retryAfter: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
          },
          { status: 429 }
        );
      }
    }

    waitUntil(
      (async () => {
        try {
          const token = await issueAccountToken(
            supabase,
            account.id,
            "verify",
            getClientIp(req)
          );
          await sendVerifyEmail({
            to: account.email,
            name: account.nickname || account.fullName,
            token,
          });
        } catch (e) {
          console.error("[account/email/resend] failed", e);
        }
      })()
    );

    return NextResponse.json({ ok: true, sentTo: account.email });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/email/resend] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
