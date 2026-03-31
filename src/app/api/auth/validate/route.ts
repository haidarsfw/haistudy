import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";

function detectDeviceType(ua: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
}

function detectDeviceLabel(ua: string): string {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh|mac os/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return "Unknown";
}

interface ValidateBody {
  key: string;
  deviceId: string;
  deviceType: string;
  referralCode?: string;
}

/**
 * POST /api/auth/validate
 * Validates a license key + device fingerprint.
 * Sets httpOnly cookies for proxy-level route protection.
 *
 * When Supabase is not configured, uses mock validation for development.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateBody;
    const { key, deviceId, deviceType, referralCode } = body;

    if (!key || !deviceId) {
      return NextResponse.json(
        { valid: false, error: "License key dan device ID diperlukan" },
        { status: 400 }
      );
    }

    const normalizedKey = key.trim().toUpperCase();

    // ─── Mock validation when Supabase is not configured ───
    if (!isSupabaseServerConfigured) {
      return handleMockValidation(normalizedKey, deviceId);
    }

    // ─── Real Supabase validation ───
    const supabase = createServerClient()!;

    // 1. Look up license key
    const { data: license, error: keyError } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", normalizedKey)
      .single();

    if (keyError || !license) {
      return NextResponse.json(
        { valid: false, error: "License key tidak valid" },
        { status: 401 }
      );
    }

    const now = new Date();

    // 2. Check suspension
    if (license.suspended_until && new Date(license.suspended_until) > now) {
      return NextResponse.json(
        {
          valid: false,
          error: `Akun disuspend sampai ${new Date(license.suspended_until).toLocaleString("id-ID")}`,
        },
        { status: 403 }
      );
    }

    // 3. Check fixed expiry
    if (license.fixed_expiry && new Date(license.fixed_expiry) < now) {
      return NextResponse.json(
        { valid: false, error: "License sudah expired" },
        { status: 403 }
      );
    }

    // 4. Get or create activation
    let { data: activation } = await supabase
      .from("activations")
      .select("*")
      .eq("license_key", normalizedKey)
      .single();

    if (!activation) {
      // First-time activation - no day-based expiry (only fixedExpiry if set by admin)
      const expiry = license.fixed_expiry
        ? new Date(license.fixed_expiry).toISOString()
        : null;

      const referralCodeGen = `REF-${normalizedKey.slice(-4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

      const { data: newActivation, error: createError } = await supabase
        .from("activations")
        .insert({
          license_key: normalizedKey,
          user_name: license.name,
          expiry,
          referral_code: referralCodeGen,
          referred_by: referralCode || null,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { valid: false, error: "Gagal mengaktifkan license" },
          { status: 500 }
        );
      }

      activation = newActivation;
    }

    // 5. Check activation expiry
    if (activation.expiry && new Date(activation.expiry) < now) {
      return NextResponse.json(
        { valid: false, error: "License sudah expired" },
        { status: 403 }
      );
    }

    // 6. Device validation (skip if unlimited)
    if (!license.unlimited_devices) {
      const { data: devices } = await supabase
        .from("devices")
        .select("*")
        .eq("activation_id", activation.id);

      const existingDevices = devices || [];
      const thisDevice = existingDevices.find((d) => d.device_id === deviceId);

      if (!thisDevice) {
        // New device - check limit
        if (existingDevices.length >= (license.max_devices || 2)) {
          return NextResponse.json(
            {
              valid: false,
              error: `License sudah digunakan di ${existingDevices.length} device (max: ${license.max_devices || 2})`,
              deviceLimitReached: true,
            },
            { status: 403 }
          );
        }

        // Register new device
        await supabase.from("devices").insert({
          activation_id: activation.id,
          device_id: deviceId,
          device_type: deviceType,
          is_primary: existingDevices.length === 0,
          verified: existingDevices.length === 0, // First device auto-verified
        });
      } else {
        // Update last seen
        await supabase
          .from("devices")
          .update({ last_seen: now.toISOString() })
          .eq("id", thisDevice.id);
      }
    }

    // 7. Ensure user_settings row exists with correct defaults
    await supabase.from("user_settings").upsert(
      {
        license_key: normalizedKey,
        dark_mode: true,
        theme: "forest",
        font: "jakarta",
        language: "id",
      },
      { onConflict: "license_key", ignoreDuplicates: true }
    );

    // 8. Handle referral
    if (referralCode && !activation.referred_by) {
      const { data: referrer } = await supabase
        .from("activations")
        .select("license_key")
        .eq("referral_code", referralCode)
        .single();

      if (referrer && referrer.license_key !== normalizedKey) {
        await supabase.from("referrals").insert({
          referrer_key: referrer.license_key,
          referred_key: normalizedKey,
        });
        await supabase
          .from("activations")
          .update({ referred_by: referralCode, referral_count: activation.referral_count + 1 })
          .eq("id", activation.id);
      }
    }

    // Build session
    const session = {
      licenseKey: normalizedKey,
      name: activation.user_name || license.name,
      isAdmin: license.is_admin,
      isTester: license.is_tester,
      expiry: activation.expiry,
      selectedClass: "",
      isPreview: license.is_preview || false,
      packageTier: (license.package_tier as "share" | "normal" | "vip") || "normal",
    };

    // Log login activity with device info
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const logDeviceType = detectDeviceType(userAgent);
    const logDeviceLabel = detectDeviceLabel(userAgent);

    await supabase.from("activity_logs").insert({
      user_name: session.name,
      action: "login",
      details: `${logDeviceLabel} ${logDeviceType} login`,
      ip_address: ip,
      device_type: logDeviceType,
      device_label: logDeviceLabel,
    });

    return buildSessionResponse(session);
  } catch (error) {
    console.error("Auth validate error:", error);
    return NextResponse.json(
      { valid: false, error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

// ─── Mock validation for development without Supabase ───

function handleMockValidation(key: string, _deviceId: string) {
  // Accept known keys and B29-* pattern
  const mockKeys: Record<
    string,
    { name: string; isAdmin: boolean; isTester: boolean }
  > = {
    ADMIN1: { name: "Admin", isAdmin: true, isTester: false },
    PREVIEW01: { name: "Preview User", isAdmin: false, isTester: true },
  };

  const match = mockKeys[key];
  const isB29Key = /^B29-[A-Z0-9]{6}$/.test(key);

  if (!match && !isB29Key) {
    return NextResponse.json(
      { valid: false, error: "License key tidak valid" },
      { status: 401 }
    );
  }

  const session = {
    licenseKey: key,
    name: match?.name || `User ${key.slice(-4)}`,
    isAdmin: match?.isAdmin || false,
    isTester: match?.isTester || false,
    expiry: null,
    selectedClass: "",
    isPreview: key === "PREVIEW01",
    packageTier: (key === "ADMIN1" ? "vip" : "normal") as "share" | "normal" | "vip",
  };

  return buildSessionResponse(session);
}

// ─── Build response with session cookies ───

function buildSessionResponse(session: {
  licenseKey: string;
  name: string;
  isAdmin: boolean;
  isTester: boolean;
  expiry: string | null;
  selectedClass: string;
  isPreview?: boolean;
  packageTier: "share" | "normal" | "vip";
}) {
  const response = NextResponse.json({ valid: true, session });

  // Set session cookie for proxy route protection
  response.cookies.set("hs-session", session.licenseKey, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Set admin flag cookie
  if (session.isAdmin) {
    response.cookies.set("hs-admin", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
