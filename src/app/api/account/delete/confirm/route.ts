import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ACCOUNT_COLUMNS, mapAccount } from "@/lib/auth/account";
import {
  consumeAccountToken,
  issueAccountToken,
} from "@/lib/auth/account-tokens";
import { sendDeleteScheduledEmail } from "@/lib/notifications/account-email";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/** How long someone has to change their mind. */
export const GRACE_DAYS = 7;

/**
 * Schedule the deletion. Still nothing is destroyed.
 *
 * POST, not GET, even though it is reached from a link in an e-mail. Mail
 * clients and security scanners follow links on their own; a GET that
 * schedules a deletion would be triggered by software that was only trying to
 * generate a preview. The link opens a page, and the page asks.
 *
 * During the grace period the account keeps working — including access that
 * was paid for. Suspending it would take away something bought and paid for on
 * the strength of a decision that is explicitly still reversible.
 */
export async function POST(req: Request) {
  // scope-exempt: token-authenticated, and the token names the account. There
  // is no session here — the link is opened from a mailbox, often on another
  // device.
  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let token = "";
    try {
      const body = (await req.json()) as Record<string, unknown>;
      token = String(body.token ?? "").trim();
    } catch {
      /* handled below */
    }
    if (!token) {
      return NextResponse.json({ error: "Tautannya tidak lengkap" }, { status: 400 });
    }

    const supabase = createServerClient()!;
    const accountId = await consumeAccountToken(supabase, token, "delete");
    if (!accountId) {
      return NextResponse.json(
        {
          error:
            "Tautannya sudah tidak berlaku. Minta ulang dari halaman Kelola akun.",
          code: "BAD_TOKEN",
        },
        { status: 400 }
      );
    }

    const requestedAt = new Date();
    const deleteAt = new Date(
      requestedAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000
    );

    const { data, error } = await supabase
      .from("accounts")
      .update({
        deletion_requested_at: requestedAt.toISOString(),
        updated_at: requestedAt.toISOString(),
      })
      .eq("id", accountId)
      .select(ACCOUNT_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      console.error("[account/delete/confirm] update failed", error);
      return NextResponse.json({ error: "Gagal menjadwalkan" }, { status: 500 });
    }

    const account = mapAccount(data);
    const deleteOn = deleteAt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // The way back, sent now rather than later. Whoever just clicked is holding
    // a page and nothing else; in six days the only thing they will still have
    // is this mail.
    waitUntil(
      (async () => {
        try {
          const cancelToken = await issueAccountToken(
            supabase,
            accountId,
            "delete_cancel",
            getClientIp(req)
          );
          await sendDeleteScheduledEmail({
            to: account.email,
            name: account.nickname || account.fullName,
            token: cancelToken,
            deleteOn,
          });
        } catch (e) {
          console.error("[account/delete/confirm] scheduled mail failed", e);
        }
      })()
    );

    return NextResponse.json({ ok: true, deleteOn, graceDays: GRACE_DAYS });
  } catch (error) {
    console.error("[account/delete/confirm] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
