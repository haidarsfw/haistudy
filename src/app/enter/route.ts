import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { getOptionalAccount } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";
import { listAccountDevices } from "@/lib/auth/account-devices";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_OPTS,
  detectDeviceType,
  readDeviceIdentity,
} from "@/lib/auth/device-id";
import {
  activateLicense,
  ActivationError,
  applySessionCookies,
} from "@/lib/auth/oauth-cookie-helpers";


/** Same-origin only — anything else here would be an open redirect. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

/**
 * GET /enter — the one door into the app.
 *
 * Being signed IN is not the same as having something OPEN. `hs-account` says
 * who you are; `hs-session` says which purchased exam period the app is
 * currently pointed at. Anything that linked straight to `/s2/uas/bm/dashboard`
 * without the second cookie got bounced to /login, and since /login then sent
 * people back to the dashboard, the two redirects chased each other. That was
 * the "login does nothing" loop: it was working, and being thrown back every
 * time.
 *
 * So nothing links to a dashboard any more. Everything links here, and here
 * decides:
 *
 *   not signed in          -> /login, carrying the intent
 *   no access yet          -> /account (which is where you buy one)
 *   several, none chosen   -> /account (the list is the chooser)
 *   one, browser known     -> open it and go straight to the dashboard
 *   one, browser new       -> /account, confirmation open, because opening an
 *                             access spends a device slot and a slot is never
 *                             spent without asking
 */
export async function GET(req: Request) {
  // scope-exempt: the scope is an OUTPUT here. It is derived from the licence
  // being opened and written to hs-scope, never read from the request.
  const url = new URL(req.url);
  const origin = url.origin;
  const wanted = url.searchParams.get("key") ?? "";
  const next = safeNext(url.searchParams.get("next"));

  const account = await getOptionalAccount();
  if (!account) {
    const login = new URL("/login", origin);
    // Come back here afterwards, not to the dashboard directly — otherwise we
    // are back to bouncing off a page that has no session cookie yet.
    login.searchParams.set(
      "next",
      `/enter${wanted ? `?key=${encodeURIComponent(wanted)}` : ""}`
    );
    return NextResponse.redirect(login, 303);
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.redirect(new URL("/account", origin), 303);
  }

  const supabase = createServerClient()!;
  const live = activeAccesses(await listAccountAccesses(supabase, account.id));

  if (live.length === 0) {
    return NextResponse.redirect(new URL("/account", origin), 303);
  }

  const target = wanted
    ? live.find((a) => a.licenseKey === wanted)
    : live.length === 1
      ? live[0]
      : undefined;

  // Several accesses and no choice made: the account page lists them, which is
  // the chooser. Sending someone into an arbitrary one would be worse.
  if (!target) {
    return NextResponse.redirect(new URL("/account", origin), 303);
  }

  const jar = await cookies();
  // Old cookie name included, so a browser that has only ever signed in with
  // Google is recognised here instead of being sent round the new-device
  // confirmation and given a second row.
  const identity = readDeviceIdentity(jar);
  const existingDeviceId = identity.id;
  const { devices } = await listAccountDevices(supabase, account.id);
  const known =
    Boolean(existingDeviceId) &&
    devices.some(
      (d) => d.licenseKey === target.licenseKey && d.deviceId === existingDeviceId
    );

  if (!known) {
    // Straight to the access list, which is where the confirmation dialog
    // lives. `/account` is only the index now, and landing there would put a
    // menu between someone and the thing they already asked for.
    const acc = new URL("/account/access", origin);
    acc.searchParams.set("enter", target.licenseKey);
    return NextResponse.redirect(acc, 303);
  }

  const { data: license } = await supabase
    .from("license_keys")
    .select("*")
    .eq("key", target.licenseKey)
    .single();
  if (!license) return NextResponse.redirect(new URL("/account", origin), 303);

  try {
    const ua = req.headers.get("user-agent") || "";
    const { session } = await activateLicense(
      supabase,
      license,
      existingDeviceId,
      detectDeviceType(ua),
      req
    );

    const dashboard = `/s${session.scope.semester}/${session.scope.examPeriod}/${session.scope.jurusan}/dashboard`;
    // `next` only wins if it is inside the scope we just opened; otherwise it
    // would land on a page the fresh cookies do not cover and bounce again.
    const dest =
      next && next.startsWith(`/s${session.scope.semester}/${session.scope.examPeriod}/`)
        ? next
        : dashboard;

    const res = NextResponse.redirect(new URL(dest, origin), 303);
    applySessionCookies(res, session);
    // Recovered from the old name: write the canonical one so this browser
    // stops depending on a cookie nothing writes any more.
    if (identity.needsCookie && existingDeviceId) {
      res.cookies.set(DEVICE_COOKIE, existingDeviceId, DEVICE_COOKIE_OPTS);
    }
    return res;
  } catch (e) {
    if (e instanceof ActivationError) {
      // Device limit, suspension, expiry: /account explains it properly and
      // offers the buttons to fix it.
      return NextResponse.redirect(new URL("/account", origin), 303);
    }
    console.error("[enter] failed", e);
    return NextResponse.redirect(new URL("/account", origin), 303);
  }
}
