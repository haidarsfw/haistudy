import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { allowsGoogleLogin } from "@/lib/auth/login-method";
import {
  activateLicense,
  ActivationError,
  applySessionCookies,
} from "@/lib/auth/oauth-cookie-helpers";
import {
  createAccount,
  findAccountByEmail,
  touchLastLogin,
  type Account,
} from "@/lib/auth/account";
import { applyAccountCookie, createAccountSession } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";

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

/** Same-origin paths only — anything else would make this an open redirect. */
function readNextCookie(request: Request): string | null {
  const raw = request.headers.get("cookie") || "";
  const hit = raw
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("hs-next="));
  if (!hit) return null;
  try {
    const value = decodeURIComponent(hit.slice("hs-next=".length));
    if (!value.startsWith("/") || value.startsWith("//")) return null;
    return value;
  } catch {
    return null;
  }
}

/**
 * GET /auth/callback?code=…
 *
 * Google sign-in. Resolves the Google address to an ACCOUNT — creating one on
 * the spot if this is a first visit — and only then decides whether there is
 * an access to open.
 *
 * The order matters. This used to look up `oauth_links` and dead-end with
 * "hubungi admin" whenever the address was unknown, which is the single most
 * common case for a would-be customer: someone who has simply never bought
 * anything. Now a new address becomes an account and lands on the account page
 * or straight back in the checkout they came from.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const origin = url.origin;

  if (errorParam === "access_denied") return redirectToLoginError(origin, "cancelled");
  if (!code) return redirectToLoginError(origin, "no_code");
  if (!isSupabaseServerConfigured) return redirectToLoginError(origin, "not_configured");

  const authClient = await createServerAuthClient();
  if (!authClient) return redirectToLoginError(origin, "not_configured");

  const { error: exchangeError } = await authClient.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("OAuth exchangeCodeForSession failed:", exchangeError);
    // The provider's raw message used to be reflected into the URL and printed
    // to the user. It reads like a crash and means nothing to a student.
    return redirectToLoginError(origin, "exchange_failed");
  }

  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user?.email) {
    return redirectToLoginError(origin, "no_email");
  }

  const email = userData.user.email.toLowerCase();
  const googleName =
    (userData.user.user_metadata?.full_name as string | undefined) ||
    (userData.user.user_metadata?.name as string | undefined) ||
    "";

  const supabase = createServerClient()!;

  let account = await findAccountByEmail(supabase, email);

  if (account && account.authProvider !== "google") {
    // One account, one way in — chosen at registration and never changed.
    return redirectToLoginError(origin, "use_password_login", email);
  }
  if (account?.status === "blocked") {
    return redirectToLoginError(origin, "suspended", email);
  }

  if (!account) {
    account = await createAccount(supabase, {
      email,
      authProvider: "google",
      // Google has already proven the address; asking again would be theatre.
      emailVerified: true,
      fullName: googleName,
      nickname: googleName.split(" ")[0] ?? "",
    });
    if (!account) {
      // Lost a race against a simultaneous sign-in; the row exists now.
      account = await findAccountByEmail(supabase, email);
    }
    if (!account) return redirectToLoginError(origin, "server_error", email);

    // Self-heal: an address that already had a licence linked the old way
    // (oauth_links) but no account_id — for instance one an admin attached by
    // hand after the backfill ran.
    await adoptLegacyLink(supabase, account, email);
  }

  const sessionToken = await createAccountSession(supabase, account.id, request);
  await touchLastLogin(supabase, account.id);

  const next = readNextCookie(request);
  const accesses = await listAccountAccesses(supabase, account.id);
  const live = activeAccesses(accesses);

  // Checkout intent always wins: they clicked a package, signing in was the
  // detour, not the destination.
  const target = next ?? (live.length === 1 ? null : "/account");

  if (target) {
    const res = NextResponse.redirect(new URL(target, origin), 303);
    applyAccountCookie(res, sessionToken);
    clearNextCookie(res);
    return res;
  }

  // Exactly one live access: nothing to choose, so open it.
  const only = live[0];
  const { data: license } = await supabase
    .from("license_keys")
    .select("*")
    .eq("key", only.licenseKey)
    .single();

  if (!license || !allowsGoogleLogin(license.login_method)) {
    const res = NextResponse.redirect(new URL("/account", origin), 303);
    applyAccountCookie(res, sessionToken);
    clearNextCookie(res);
    return res;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const existingDeviceId = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith("hs-device-id="))
    ?.slice("hs-device-id=".length);
  const deviceId = existingDeviceId || crypto.randomUUID();
  const ua = request.headers.get("user-agent") || "";

  try {
    const { session } = await activateLicense(
      supabase,
      license,
      deviceId,
      detectDeviceType(ua),
      request
    );

    const dashboard = new URL(
      `/s${session.scope.semester}/${session.scope.examPeriod}/${session.scope.jurusan}/dashboard`,
      origin
    );
    const response = NextResponse.redirect(dashboard, 303);
    applySessionCookies(response, session);
    applyAccountCookie(response, sessionToken);
    clearNextCookie(response);
    if (!existingDeviceId) {
      response.cookies.set("hs-device-id", deviceId, COOKIE_OPTS);
    }
    return response;
  } catch (e) {
    // The account session is real even when the access could not be opened, so
    // keep them signed in and explain it on the account page rather than
    // throwing them back to a login screen they just came from.
    const res = NextResponse.redirect(new URL("/account", origin), 303);
    applyAccountCookie(res, sessionToken);
    clearNextCookie(res);

    if (e instanceof ActivationError) {
      const body = (await e.response.clone().json().catch(() => null)) as {
        error?: string;
        deviceLimitReached?: boolean;
      } | null;
      const reason = body?.deviceLimitReached
        ? "device_limit"
        : body?.error?.includes("expired")
          ? "expired"
          : body?.error?.includes("disuspend")
            ? "suspended"
            : "activation_failed";
      res.headers.set("Location", new URL(`/account?notice=${reason}`, origin).toString());
      return res;
    }
    console.error("[auth/callback] activation failed", e);
    return res;
  }
}

function clearNextCookie(res: NextResponse) {
  res.cookies.set("hs-next", "", { path: "/", maxAge: 0 });
}

/**
 * Attach a pre-account licence to a freshly created account, if one is sitting
 * in `oauth_links` for this address without an `account_id`.
 */
async function adoptLegacyLink(
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  supabase: any,
  account: Account,
  email: string
): Promise<void> {
  try {
    const { data: link } = await supabase
      .from("oauth_links")
      .select("license_key")
      .eq("email_lower", email)
      .maybeSingle();
    if (!link?.license_key) return;

    await supabase
      .from("license_keys")
      .update({ account_id: account.id })
      .eq("key", link.license_key)
      .is("account_id", null);
  } catch (e) {
    console.error("[auth/callback] adopting legacy oauth_link failed", e);
  }
}
