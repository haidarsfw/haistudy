import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  scopeKey as toScopeKey,
  DEFAULT_SCOPE,
  LATEST_SCOPE,
  validateScopeTuple,
} from "@/lib/scope";
import type { ScopeTuple, ExamPeriod } from "@/types/scope";
import { firstWord, capitalizeFirst } from "@/lib/name";

export interface SessionPayload {
  licenseKey: string;
  name: string;
  // Short name / nickname shown everywhere in-app (never empty).
  shortName: string;
  isAdmin: boolean;
  isTester: boolean;
  expiry: string | null;
  selectedClass: string;
  isPreview?: boolean;
  packageTier: "share" | "normal" | "vip" | "diamond";
  scope: ScopeTuple;
  scopeKey: string;
}

export interface EmbeddedSettings {
  darkMode: boolean;
  theme: string;
  font: string;
  language: string;
  selectedClass: string;
  darkModeSchedule: unknown;
}

export interface ActivateResult {
  session: SessionPayload;
  embeddedSettings: EmbeddedSettings | null;
}

interface LicenseRow {
  key: string;
  name: string;
  short_name: string | null;
  is_admin: boolean;
  is_tester: boolean;
  is_preview: boolean | null;
  package_tier: string | null;
  semester: number | null;
  exam_period: string | null;
  jurusan: string | null;
  suspended_until: string | null;
  fixed_expiry: string | null;
  max_devices: number | null;
  unlimited_devices: boolean | null;
}

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

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Custom error wrapping a NextResponse so the caller can return it directly.
 * Throw inside activateLicense to short-circuit with an HTTP error.
 */
export class ActivationError extends Error {
  response: NextResponse;
  constructor(response: NextResponse) {
    super("ActivationError");
    this.response = response;
  }
}

/**
 * Shared license activation pipeline.
 * Runs steps 2-9 from the validate route: suspension / expiry checks,
 * activation upsert, device limit, settings upsert, referral handling,
 * scope resolution (admin → LATEST_SCOPE), activity log.
 *
 * Used by both `/api/auth/validate` (license-key login) and `/auth/callback`
 * (Google OAuth login).
 */
export async function activateLicense(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  license: LicenseRow,
  deviceId: string,
  deviceType: string,
  request: Request,
  options: { referralCode?: string } = {}
): Promise<ActivateResult> {
  const normalizedKey = license.key.trim().toUpperCase();
  const now = new Date();

  // Check suspension
  if (license.suspended_until && new Date(license.suspended_until) > now) {
    throw new ActivationError(
      NextResponse.json(
        {
          valid: false,
          error: `Akun disuspend sampai ${new Date(license.suspended_until).toLocaleString("id-ID")}`,
        },
        { status: 403 }
      )
    );
  }

  // Check fixed expiry
  if (license.fixed_expiry && new Date(license.fixed_expiry) < now) {
    throw new ActivationError(
      NextResponse.json(
        { valid: false, error: "License sudah expired" },
        { status: 403 }
      )
    );
  }

  // Get or create activation
  let { data: activation } = await supabase
    .from("activations")
    .select("*")
    .eq("license_key", normalizedKey)
    .single();

  if (!activation) {
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const expiry = license.fixed_expiry
      ? new Date(license.fixed_expiry).toISOString()
      : thirtyDaysFromNow;

    const referralCodeGen = `REF-${normalizedKey.slice(-4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const { data: newActivation, error: createError } = await supabase
      .from("activations")
      .insert({
        license_key: normalizedKey,
        user_name: license.name,
        short_name: license.short_name ?? null,
        expiry,
        referral_code: referralCodeGen,
        referred_by: options.referralCode || null,
      })
      .select()
      .single();

    if (createError || !newActivation) {
      throw new ActivationError(
        NextResponse.json(
          { valid: false, error: "Gagal mengaktifkan license" },
          { status: 500 }
        )
      );
    }
    activation = newActivation;
  }

  // Check activation expiry
  if (activation.expiry && new Date(activation.expiry) < now) {
    throw new ActivationError(
      NextResponse.json(
        { valid: false, error: "License sudah expired" },
        { status: 403 }
      )
    );
  }

  // Device validation + settings upsert in parallel
  const [deviceResult, settingsResult] = await Promise.all([
    (async () => {
      if (license.unlimited_devices) return { ok: true as const, error: null };

      const { data: devices } = await supabase
        .from("devices")
        .select("*")
        .eq("activation_id", activation.id);

      const existingDevices = devices || [];
      const thisDevice = existingDevices.find(
        (d: { device_id: string }) => d.device_id === deviceId
      );

      if (!thisDevice) {
        if (existingDevices.length >= (license.max_devices || 2)) {
          return {
            ok: false as const,
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
      return { ok: true as const, error: null };
    })(),
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

  if (!deviceResult.ok) {
    throw new ActivationError(
      NextResponse.json(
        {
          valid: false,
          error: deviceResult.error,
          deviceLimitReached: true,
        },
        { status: 403 }
      )
    );
  }

  const settingsData = settingsResult;

  // Handle referral (fire and forget)
  if (options.referralCode && !activation.referred_by) {
    (async () => {
      try {
        const { data: referrer } = await supabase
          .from("activations")
          .select("license_key")
          .eq("referral_code", options.referralCode!)
          .single();

        if (referrer && referrer.license_key !== normalizedKey) {
          await supabase.from("referrals").insert({
            referrer_key: referrer.license_key,
            referred_key: normalizedKey,
          });
          await supabase
            .from("activations")
            .update({
              referred_by: options.referralCode!,
              referral_count: (activation!.referral_count ?? 0) + 1,
            })
            .eq("id", activation!.id);
        }
      } catch {
        /* non-critical */
      }
    })();
  }

  // Resolve scope. Admin always lands on LATEST_SCOPE.
  const scopeTuple: ScopeTuple = {
    semester:
      typeof license.semester === "number" ? license.semester : DEFAULT_SCOPE.semester,
    examPeriod: (license.exam_period as ExamPeriod) || DEFAULT_SCOPE.examPeriod,
    jurusan:
      typeof license.jurusan === "string" ? license.jurusan : DEFAULT_SCOPE.jurusan,
  };
  const licenseScope = validateScopeTuple(scopeTuple) ? scopeTuple : DEFAULT_SCOPE;
  const effectiveScope: ScopeTuple = license.is_admin ? LATEST_SCOPE : licenseScope;

  const session: SessionPayload = {
    licenseKey: normalizedKey,
    name: activation.user_name || license.name,
    shortName: capitalizeFirst(
      activation.short_name ||
        license.short_name ||
        firstWord(activation.user_name || license.name)
    ),
    isAdmin: license.is_admin,
    isTester: license.is_tester,
    expiry: activation.expiry,
    selectedClass: "",
    isPreview: license.is_preview || false,
    packageTier:
      (license.package_tier as "share" | "normal" | "vip" | "diamond") || "normal",
    scope: effectiveScope,
    scopeKey: toScopeKey(effectiveScope),
  };

  const embeddedSettings: EmbeddedSettings | null = settingsData
    ? {
        darkMode: settingsData.dark_mode ?? true,
        theme: settingsData.theme ?? "forest",
        font: settingsData.font ?? "jakarta",
        language: settingsData.language ?? "id",
        selectedClass: settingsData.selected_class ?? "",
        darkModeSchedule: settingsData.dark_mode_schedule ?? null,
      }
    : null;

  // Activity log (fire and forget)
  const userAgent = request.headers.get("user-agent") || "";
  const logDeviceType = detectDeviceType(userAgent);
  const logDeviceLabel = detectDeviceLabel(userAgent);
  const ip = getClientIp(request);
  (async () => {
    try {
      await supabase.from("activity_logs").insert({
        user_name: session.name,
        action: "login",
        details: `${logDeviceLabel} ${logDeviceType} login`,
        ip_address: ip,
        device_type: logDeviceType,
        device_label: logDeviceLabel,
        semester: effectiveScope.semester,
        exam_period: effectiveScope.examPeriod,
        jurusan: effectiveScope.jurusan,
      });
    } catch {
      /* non-critical */
    }
  })();

  return { session, embeddedSettings };
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};

/**
 * Apply the hs-session, hs-scope, hs-admin cookies onto an existing response.
 * Used by /auth/callback (returns a redirect, can't use buildSessionResponse).
 */
export function applySessionCookies(response: NextResponse, session: SessionPayload) {
  response.cookies.set("hs-session", session.licenseKey, COOKIE_OPTS);
  response.cookies.set("hs-scope", session.scopeKey, COOKIE_OPTS);
  if (session.isAdmin) {
    response.cookies.set("hs-admin", "1", COOKIE_OPTS);
  }
  return response;
}

/**
 * Build a JSON validation response with the standard hs-* cookies set.
 * Used by /api/auth/validate.
 */
export function buildSessionResponse(
  session: SessionPayload,
  settings: EmbeddedSettings | Record<string, unknown> | null
) {
  const response = NextResponse.json({ valid: true, session, settings });
  return applySessionCookies(response, session);
}
