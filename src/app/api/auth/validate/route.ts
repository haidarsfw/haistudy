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

    // 6–7–8. Run device validation + settings in parallel (they're independent)
    const [deviceResult, settingsResult] = await Promise.all([
      // --- Device validation ---
      (async () => {
        if (license.unlimited_devices) return { ok: true, error: null };

        const { data: devices } = await supabase
          .from("devices")
          .select("*")
          .eq("activation_id", activation.id);

        const existingDevices = devices || [];
        const thisDevice = existingDevices.find((d) => d.device_id === deviceId);

        if (!thisDevice) {
          if (existingDevices.length >= (license.max_devices || 2)) {
            return {
              ok: false,
              error: `License sudah digunakan di ${existingDevices.length} device (max: ${license.max_devices || 2})`,
            };
          }
          await supabase.from("devices").insert({
            activation_id: activation.id,
            device_id: deviceId,
            device_type: deviceType,
            is_primary: existingDevices.length === 0,
            verified: existingDevices.length === 0,
          });
        } else {
          await supabase
            .from("devices")
            .update({ last_seen: now.toISOString() })
            .eq("id", thisDevice.id);
        }
        return { ok: true, error: null };
      })(),

      // --- User settings upsert + fetch (single operation) ---
      (async () => {
        const { data } = await supabase
          .from("user_settings")
          .upsert(
            {
              license_key: normalizedKey,
              dark_mode: true,
              theme: "forest",
              font: "jakarta",
              language: "id",
            },
            { onConflict: "license_key", ignoreDuplicates: true }
          )
          .select()
          .single();

        // If upsert with ignoreDuplicates returns nothing, fetch existing
        if (!data) {
          const { data: existing } = await supabase
            .from("user_settings")
            .select("*")
            .eq("license_key", normalizedKey)
            .single();
          return existing;
        }
        return data;
      })(),
    ]);

    // Check device validation result
    if (!deviceResult.ok) {
      return NextResponse.json(
        {
          valid: false,
          error: deviceResult.error,
          deviceLimitReached: true,
        },
        { status: 403 }
      );
    }

    const settingsData = settingsResult;

    // 9. Handle referral (fire and forget — non-blocking)
    if (referralCode && !activation.referred_by) {
      (async () => {
        try {
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
              .update({ referred_by: referralCode, referral_count: activation!.referral_count + 1 })
              .eq("id", activation!.id);
          }
        } catch { /* non-critical */ }
      })();
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

    // Build embedded settings
    const embeddedSettings = settingsData ? {
      darkMode: settingsData.dark_mode ?? true,
      theme: settingsData.theme ?? "forest",
      font: settingsData.font ?? "jakarta",
      language: settingsData.language ?? "id",
      selectedClass: settingsData.selected_class ?? "",
      darkModeSchedule: settingsData.dark_mode_schedule ?? null,
    } : null;

    // Log login activity (fire and forget — non-blocking)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "";
    const logDeviceType = detectDeviceType(userAgent);
    const logDeviceLabel = detectDeviceLabel(userAgent);

    (async () => {
      try {
        await supabase.from("activity_logs").insert({
          user_name: session.name,
          action: "login",
          details: `${logDeviceLabel} ${logDeviceType} login`,
          ip_address: ip,
          device_type: logDeviceType,
          device_label: logDeviceLabel,
        });
      } catch { /* non-critical */ }
    })();

    return buildSessionResponse(session, embeddedSettings);
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

  return buildSessionResponse(session, null);
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
}, settings: Record<string, unknown> | null) {
  const response = NextResponse.json({ valid: true, session, settings });

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
