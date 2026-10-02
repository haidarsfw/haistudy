import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCaller } from "@/lib/auth/session-license";
import { accountColumns, accountIdForLicense } from "@/lib/auth/account-link";

/**
 * Cross-device, cross-PERIOD onboarding state.
 *
 * The flag used to live only on user_settings.onboarding_completed_at, and
 * user_settings is keyed by license_key — one exam period. So buying the next
 * period handed someone a fresh key, an empty settings row, and the entire tour
 * again, months into using the app. It now lives on the account, which is the
 * thing that actually persists.
 *
 * Both are read and both are written, account first. Migration 075 is applied;
 * the per-licence flag stays because rows written before it existed still hold
 * the only answer for those people. localStorage stays an instant-paint cache.
 */

// GET /api/onboarding → { completed: boolean }
export async function GET() {
  // scope-exempt: account-private, keyed by the session's own license_key
  // (getCaller) — not cohort/scoped data; same pattern as /api/settings & /api/profile.
  const caller = await getCaller();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ completed: false });
  }
  const supabase = createServerClient()!;

  // The account first: it survives a new period. supabase-js reports a failed
  // read as `error`, it does not throw; the try/catch only guards a network
  // exception. Either way the per-licence flag answers instead.
  const accountId = await accountIdForLicense(supabase, caller.licenseKey);
  if (accountId) {
    try {
      const { data: acc, error } = await supabase
        .from("accounts")
        .select("onboarding_completed_at")
        .eq("id", accountId)
        .maybeSingle();
      if (!error && acc?.onboarding_completed_at) {
        return NextResponse.json({ completed: true });
      }
    } catch {
      // Network exception. Fall through to the per-licence flag.
    }
  }

  const { data } = await supabase
    .from("user_settings")
    .select("onboarding_completed_at")
    .eq("license_key", caller.licenseKey)
    .maybeSingle();
  return NextResponse.json({ completed: Boolean(data?.onboarding_completed_at) });
}

// POST /api/onboarding → mark the account's onboarding as done (idempotent).
export async function POST() {
  // scope-exempt: account-private, keyed by the session's own license_key
  // (getCaller) — not cohort/scoped data; same pattern as /api/settings & /api/profile.
  const caller = await getCaller();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ success: true });
  }
  const supabase = createServerClient()!;
  // Only sets onboarding_completed_at — the upsert payload deliberately omits
  // every other settings column so a settings sync never clobbers it and this
  // never clobbers settings.
  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        license_key: caller.licenseKey,
        ...(await accountColumns(supabase, caller.licenseKey)),
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "license_key" }
    );
  if (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // And on the account, so the next period does not start the tour over. Failure
  // here is not fatal: the per-licence flag above already stops it for THIS
  // period.
  const accountId = await accountIdForLicense(supabase, caller.licenseKey);
  if (accountId) {
    const { error: accErr } = await supabase
      .from("accounts")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", accountId)
      .is("onboarding_completed_at", null);
    if (accErr) {
      console.warn("Onboarding account flag skipped:", accErr.message);
    }
  }

  return NextResponse.json({ success: true });
}
