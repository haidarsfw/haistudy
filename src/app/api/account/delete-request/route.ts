import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";

/**
 * Ask for the account to be deleted.
 *
 * A request, not an instant wipe. Two reasons: an account can be holding paid
 * access that has not expired, and there is no automated refund behind it —
 * a mis-click would destroy something someone paid for with nothing to undo
 * it. And the licences, activations and study history hanging off this account
 * are what the admin needs in order to unwind a purchase properly.
 *
 * An account with live access cannot even file the request; it is sent to the
 * admin instead, who can see what would be thrown away.
 */
export async function POST() {
  // scope-exempt: flags the caller's own account row.
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }
    const supabase = createServerClient()!;

    const live = activeAccesses(await listAccountAccesses(supabase, account.id));
    if (live.length > 0) {
      return NextResponse.json(
        {
          error:
            "Akunmu masih punya akses aktif. Hubungi admin dulu supaya aksesnya tidak hilang begitu saja.",
          code: "HAS_ACTIVE_ACCESS",
        },
        { status: 409 }
      );
    }

    if (account.deletionRequestedAt) {
      return NextResponse.json({ ok: true, alreadyRequested: true });
    }

    const { error } = await supabase
      .from("accounts")
      .update({
        deletion_requested_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (error) {
      console.error("[account/delete-request] failed", error);
      return NextResponse.json({ error: "Gagal mengirim permintaan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/delete-request] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
