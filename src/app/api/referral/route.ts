import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { getCaller } from "@/lib/auth/session-license";

// ─── Mock store ───
const mockReferrals = new Map<
  string,
  { code: string; count: number }
>();

// In-memory per-license cooldown to slow brute-force of referral codes.
// Resets on deploy - fine for free tier since determined attackers would still hit DB lookups.
const recentReferralAttempts = new Map<string, number>();
const REFERRAL_COOLDOWN_MS = 10_000;

function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ─── GET /api/referral?licenseKey=xxx ───
export async function GET() {
  try {
    // Identity from the hs-session cookie, NOT a client-supplied param (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    if (!isSupabaseServerConfigured) {
      const data = mockReferrals.get(licenseKey);
      if (!data) {
        // Auto-generate on first access
        const code = generateReferralCode();
        mockReferrals.set(licenseKey, { code, count: 0 });
        return NextResponse.json({ referralCode: code, referralCount: 0 });
      }
      return NextResponse.json({
        referralCode: data.code,
        referralCount: data.count,
      });
    }

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("activations")
      .select("referral_code, referral_count")
      .eq("license_key", licenseKey)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (!data || !data.referral_code) {
      // Generate and save referral code
      const code = generateReferralCode();
      await supabase
        .from("activations")
        .update({ referral_code: code })
        .eq("license_key", licenseKey);

      return NextResponse.json({ referralCode: code, referralCount: 0 });
    }

    return NextResponse.json({
      referralCode: data.referral_code,
      referralCount: data.referral_count || 0,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── POST /api/referral - Apply referral code ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { referralCode } = body;

    // Identity from the hs-session cookie, NOT a client-supplied param (IDOR fix).
    const caller = await getCaller();
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const licenseKey = caller.licenseKey;

    if (!referralCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Per-license cooldown - blocks rapid-fire brute-force of the 6-char code space
    const lastAttempt = recentReferralAttempts.get(licenseKey);
    if (lastAttempt && Date.now() - lastAttempt < REFERRAL_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Tunggu sebentar sebelum mencoba lagi" },
        { status: 429 }
      );
    }
    recentReferralAttempts.set(licenseKey, Date.now());

    if (!isSupabaseServerConfigured) {
      // Find referrer
      for (const [key, data] of mockReferrals.entries()) {
        if (data.code === referralCode && key !== licenseKey) {
          data.count += 1;
          return NextResponse.json({ success: true, referrerName: "User" });
        }
      }
      return NextResponse.json(
        { error: "Kode referral tidak valid" },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;

    // Find who owns this referral code
    const { data: referrer } = await supabase
      .from("activations")
      .select("license_key, user_name")
      .eq("referral_code", referralCode)
      .single();

    if (!referrer || referrer.license_key === licenseKey) {
      return NextResponse.json(
        { error: "Kode referral tidak valid" },
        { status: 400 }
      );
    }

    // Check if already referred
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_key", licenseKey)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Kamu sudah menggunakan referral" },
        { status: 400 }
      );
    }

    // Create referral record
    await supabase.from("referrals").insert({
      referrer_key: referrer.license_key,
      referred_key: licenseKey,
    });

    // Increment referral count
    await supabase.rpc("increment_referral_count", {
      key: referrer.license_key,
    });

    return NextResponse.json({
      success: true,
      referrerName: referrer.user_name,
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
