import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { consumeAccountToken } from "@/lib/auth/account-tokens";

/**
 * Call it off.
 *
 * Two ways in, because the two situations are different. Someone still signed
 * in can cancel straight from the banner — asking them to go and find an
 * e-mail to undo something they can already see would be theatre. Someone who
 * only has the mail uses the token.
 *
 * Cancelling is deliberately the cheap direction. Every gate on this flow
 * guards the destructive step; putting gates on the recovery step as well would
 * be protecting the wrong outcome.
 */
export async function POST(req: Request) {
  // scope-exempt: account layer only.
  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let token = "";
    try {
      const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
      token = String(body.token ?? "").trim();
    } catch {
      /* a signed-in caller does not need one */
    }

    const supabase = createServerClient()!;

    let accountId: string | null = null;
    if (token) {
      accountId = await consumeAccountToken(supabase, token, "delete_cancel");
      if (!accountId) {
        return NextResponse.json(
          { error: "Tautannya sudah tidak berlaku.", code: "BAD_TOKEN" },
          { status: 400 }
        );
      }
    } else {
      const account = await getOptionalAccount();
      if (!account) {
        return NextResponse.json({ error: "Kamu belum masuk" }, { status: 401 });
      }
      accountId = account.id;
    }

    const { error } = await supabase
      .from("accounts")
      .update({
        deletion_requested_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);

    if (error) {
      console.error("[account/delete/cancel] failed", error);
      return NextResponse.json({ error: "Gagal membatalkan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/delete/cancel] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
