import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCaller } from "@/lib/auth/session-license";

/**
 * Cross-device onboarding state. The tour is a once-per-ACCOUNT thing, so its
 * "completed" flag lives on user_settings.onboarding_completed_at (keyed by the
 * hs-session license key) instead of per-device localStorage. use-onboarding
 * reads this on load and writes it on finish; localStorage stays as an
 * instant-paint cache only.
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
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "license_key" }
    );
  if (error) {
    console.error("Onboarding POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
