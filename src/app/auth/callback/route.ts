import { NextResponse } from "next/server";
import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import {
  activateLicense,
  ActivationError,
  applySessionCookies,
} from "@/lib/auth/oauth-cookie-helpers";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};

function detectDeviceType(ua: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop";
}

function redirectToLoginError(
  origin: string,
  code: string,
  email?: string | null
): NextResponse {
  const url = new URL("/login", origin);
  url.searchParams.set("oauth_error", code);
  if (email) url.searchParams.set("email", email);
  return NextResponse.redirect(url, 303);
}

/**
 * GET /auth/callback?code=…
 * OAuth callback - exchanges the Supabase Auth code, looks up the linked
 * license via oauth_links, runs the shared activateLicense pipeline, and
 * lands the user on the scoped dashboard.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const origin = url.origin;

  if (errorParam === "access_denied") {
    return redirectToLoginError(origin, "cancelled");
  }
  if (!code) {
    return redirectToLoginError(origin, "no_code");
  }
  if (!isSupabaseServerConfigured) {
    return redirectToLoginError(origin, "not_configured");
  }

  const authClient = await createServerAuthClient();
  if (!authClient) {
    return redirectToLoginError(origin, "not_configured");
  }

  const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth exchangeCodeForSession failed:", exchangeError);
    const url = new URL("/login", origin);
    url.searchParams.set("oauth_error", "exchange_failed");
    url.searchParams.set(
      "detail",
      exchangeError.message || "Unknown exchange error"
    );
    return NextResponse.redirect(url, 303);
  }

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user?.email) {
    return redirectToLoginError(origin, "no_email");
  }

  const email = userData.user.email.toLowerCase();

  const supabase = createServerClient()!;
  const { data: linkRow } = await supabase
    .from("oauth_links")
    .select("license_key")
    .eq("email_lower", email)
    .maybeSingle();

  if (!linkRow?.license_key) {
    return redirectToLoginError(origin, "email_not_linked", email);
  }

  const { data: license, error: licenseError } = await supabase
    .from("license_keys")
    .select("*")
    .eq("key", linkRow.license_key)
    .single();

  if (licenseError || !license) {
    return redirectToLoginError(origin, "license_not_found");
  }

  // Server-generated device id for OAuth path (key-login path uses client device id)
  const cookieHeader = request.headers.get("cookie") || "";
  const existingDeviceId = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("hs-device-id="))
    ?.slice("hs-device-id=".length);
  const deviceId = existingDeviceId || crypto.randomUUID();
  const ua = request.headers.get("user-agent") || "";
  const deviceType = detectDeviceType(ua);

  try {
    const { session } = await activateLicense(
      supabase,
      license,
      deviceId,
      deviceType,
      request
    );

    const dashboard = new URL(
      `/s${session.scope.semester}/${session.scope.examPeriod}/${session.scope.jurusan}/dashboard`,
      origin
    );
    const response = NextResponse.redirect(dashboard, 303);
    applySessionCookies(response, session);
    if (!existingDeviceId) {
      response.cookies.set("hs-device-id", deviceId, COOKIE_OPTS);
    }
    return response;
  } catch (e) {
    if (e instanceof ActivationError) {
      const body = (await e.response.clone().json().catch(() => null)) as
        | { error?: string; deviceLimitReached?: boolean }
        | null;
      const status = e.response.status;
      if (body?.deviceLimitReached) {
        return redirectToLoginError(origin, "device_limit");
      }
      if (status === 403 && body?.error?.includes("expired")) {
        return redirectToLoginError(origin, "expired");
      }
      if (status === 403 && body?.error?.includes("disuspend")) {
        return redirectToLoginError(origin, "suspended");
      }
      return redirectToLoginError(origin, "activation_failed");
    }
    return redirectToLoginError(origin, "server_error");
  }
}
