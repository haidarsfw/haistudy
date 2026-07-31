import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LATEST_SCOPE, scopeKey } from "@/lib/scope";
import { scopeKeyFromCookie, signScopeValue } from "@/lib/auth/scope-cookie";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 3600,
};

// scope-exempt: this route MINTS a preview session, so there is no scope cookie
// to require yet. The period it hands out is fixed in code, not taken from the
// request.
export async function POST() {
  // Never overwrite a real session with PREVIEW. A logged-in user landing here
  // (stale link, double-tap) keeps their session; we just echo their scope.
  const existing = (await cookies()).get("hs-session")?.value;
  if (existing && existing !== "PREVIEW") {
    const sc = scopeKeyFromCookie((await cookies()).get("hs-scope")?.value);
    return NextResponse.json({
      ok: true,
      alreadyAuthenticated: true,
      // Without stripping the stamp this echoed "s2-uas-bm~AbC..." back to the
      // browser, which reads as a scope key and matches nothing.
      scopeKey: sc || scopeKey(LATEST_SCOPE),
    });
  }

  // LATEST_SCOPE, matching /preview. This route still said DEFAULT_SCOPE, an
  // exam period that has already happened — the same drift /preview was fixed
  // for, left behind in its sibling. A preview session is only ever entitled to
  // the newest period, so an older one here would now be refused outright.
  const res = NextResponse.json({
    ok: true,
    scopeKey: scopeKey(LATEST_SCOPE),
  });
  res.cookies.set("hs-session", "PREVIEW", COOKIE_OPTS);
  res.cookies.set(
    "hs-scope",
    signScopeValue(scopeKey(LATEST_SCOPE), "PREVIEW"),
    COOKIE_OPTS
  );
  return res;
}
