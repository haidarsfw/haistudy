import { NextResponse } from "next/server";
import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { isAcceptableKeyFormat } from "@/lib/license/generator";
import {
  checkServerRateLimit,
  recordLoginAttempt,
} from "@/lib/auth/server-rate-limit";
import { scopeKey as toScopeKey, DEFAULT_SCOPE } from "@/lib/scope";
import {
  activateLicense,
  ActivationError,
  buildSessionResponse,
  type SessionPayload,
} from "@/lib/auth/oauth-cookie-helpers";

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
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
 * Sets httpOnly cookies (hs-session, hs-admin, hs-scope) for proxy/API guards.
 * Rate-limited per IP (5-char keys → brute-force defense).
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  // ─── Pre-flight rate limit ───
  const limit = await checkServerRateLimit(ip);
  if (!limit.allowed) {
    const res = NextResponse.json(
      { valid: false, error: "Terlalu banyak percobaan login. Coba lagi nanti." },
      { status: 429 }
    );
    res.headers.set("Retry-After", String(limit.retryAfter));
    return res;
  }

  try {
    const body = (await request.json()) as ValidateBody;
    const { key, deviceId, deviceType, referralCode } = body;

    if (!key || !deviceId) {
      void recordLoginAttempt(ip, "fail");
      return NextResponse.json(
        { valid: false, error: "License key dan device ID diperlukan" },
        { status: 400 }
      );
    }

    const normalizedKey = key.trim().toUpperCase();

    // Reject obvious malformed input before DB lookup.
    if (!isAcceptableKeyFormat(normalizedKey)) {
      void recordLoginAttempt(ip, "fail");
      return NextResponse.json(
        { valid: false, error: "License key tidak valid" },
        { status: 401 }
      );
    }

    // ─── Mock validation when Supabase is not configured ───
    if (!isSupabaseServerConfigured) {
      return handleMockValidation(normalizedKey, deviceId);
    }

    // ─── Real Supabase validation ───
    const supabase = createServerClient()!;

    const { data: license, error: keyError } = await supabase
      .from("license_keys")
      .select("*")
      .eq("key", normalizedKey)
      .single();

    if (keyError || !license) {
      void recordLoginAttempt(ip, "fail");
      return NextResponse.json(
        { valid: false, error: "License key tidak valid" },
        { status: 401 }
      );
    }

    try {
      const { session, embeddedSettings } = await activateLicense(
        supabase,
        license,
        deviceId,
        deviceType,
        request,
        { referralCode }
      );
      void recordLoginAttempt(ip, "ok");
      return buildSessionResponse(session, embeddedSettings);
    } catch (e) {
      if (e instanceof ActivationError) {
        void recordLoginAttempt(ip, "fail");
        return e.response;
      }
      throw e;
    }
  } catch (error) {
    console.error("Auth validate error:", error);
    void recordLoginAttempt(ip, "fail");
    return NextResponse.json(
      { valid: false, error: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}

// ─── Mock validation for development without Supabase ───

function handleMockValidation(key: string, _deviceId: string) {
  const mockKeys: Record<
    string,
    { name: string; isAdmin: boolean; isTester: boolean }
  > = {
    ADMIN1: { name: "Admin", isAdmin: true, isTester: false },
    PREVIEW01: { name: "Preview User", isAdmin: false, isTester: true },
  };

  const match = mockKeys[key];
  const isB29Key = /^B29-[A-Z0-9]{6}$/.test(key);
  const isNewKey = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/.test(key);

  if (!match && !isB29Key && !isNewKey) {
    return NextResponse.json(
      { valid: false, error: "License key tidak valid" },
      { status: 401 }
    );
  }

  const session: SessionPayload = {
    licenseKey: key,
    name: match?.name || `User ${key.slice(-4)}`,
    isAdmin: match?.isAdmin || false,
    isTester: match?.isTester || false,
    expiry: null,
    selectedClass: "",
    isPreview: key === "PREVIEW01",
    packageTier: (key === "ADMIN1" ? "vip" : "normal") as
      | "share"
      | "normal"
      | "vip"
      | "diamond",
    scope: DEFAULT_SCOPE,
    scopeKey: toScopeKey(DEFAULT_SCOPE),
  };

  return buildSessionResponse(session, null);
}
