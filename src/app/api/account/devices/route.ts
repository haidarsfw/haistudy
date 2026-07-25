import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { requireAccount, requireAccountSession, revokeAllAccountSessions } from "@/lib/auth/account-session";
import { listAccountDevices, releaseAccountDevice } from "@/lib/auth/account-devices";
import { formatRetryAfter } from "@/lib/auth/account-rate-limit";

/** Devices signed into any of this account's accesses. */
export async function GET() {
  // scope-exempt: lists devices belonging to the caller's own licences.
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ devices: [], slots: [] });
    }
    const view = await listAccountDevices(createServerClient()!, account.id);
    return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Free a device slot, or sign every other device out of the account.
 *
 * Two different things on purpose. Releasing a DEVICE frees a licence slot and
 * is rate-limited, because unlimited releasing is how a 3-device licence
 * becomes a rota for three people. Signing out other SESSIONS is a security
 * action with no such incentive, so it is unlimited.
 */
export async function DELETE(req: Request) {
  // scope-exempt: account layer, ownership re-checked inside releaseAccountDevice.
  try {
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }
    const supabase = createServerClient()!;

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* an empty body is not valid for either action below */
    }

    if (body.action === "signout-others") {
      const { account, sessionId } = await requireAccountSession();
      await revokeAllAccountSessions(supabase, account.id, sessionId);
      return NextResponse.json({ ok: true });
    }

    const account = await requireAccount();
    const deviceRowId = String(body.deviceRowId ?? "").trim();
    if (!deviceRowId) {
      return NextResponse.json({ error: "Perangkat tidak disebutkan" }, { status: 400 });
    }

    const result = await releaseAccountDevice(supabase, account.id, deviceRowId);
    if (!result.ok) {
      const retry = result.retryAfter;
      return NextResponse.json(
        {
          error: retry
            ? `${result.error} Bisa mengeluarkan lagi ${formatRetryAfter(retry)}.`
            : result.error,
          retryAfter: retry ?? 0,
        },
        { status: retry ? 429 : 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/devices] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
