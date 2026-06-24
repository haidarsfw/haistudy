import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

const SCOPE_RE = /^s\d+-(uts|uas)-[a-z0-9-]{1,16}$/;

/**
 * Preview mode entry point - Route Handler.
 *
 * Returns a 307 redirect to the scoped dashboard with hs-session=PREVIEW
 * and hs-scope set on the *same* response. Using NextResponse.redirect +
 * response.cookies.set guarantees the Set-Cookie header rides along with
 * the Location header on a single hop; the prior cookies().set() + redirect()
 * combo from next/navigation occasionally dropped cookies on the redirect
 * response, causing the proxy to bounce the follow-up request to /login.
 */
export async function GET(request: Request) {
  const jar = await cookies();

  // A logged-in (real) user must never be downgraded into preview by tapping a
  // stale "Coba Preview" link. Setting hs-session=PREVIEW here would overwrite
  // their real session cookie and trap them in preview mode. Send them straight
  // to their own scoped dashboard instead, touching no cookies.
  const existing = jar.get("hs-session")?.value;
  if (existing && existing !== "PREVIEW") {
    const sc = jar.get("hs-scope")?.value;
    const sk = sc && SCOPE_RE.test(sc) ? sc : scopeKey(DEFAULT_SCOPE);
    return NextResponse.redirect(
      new URL(`/${sk.replace(/-/g, "/")}/dashboard`, request.url),
      307
    );
  }

  const dashboardPath = `/${scopeKey(DEFAULT_SCOPE).replace(/-/g, "/")}/dashboard`;
  const target = new URL(dashboardPath, request.url);
  const res = NextResponse.redirect(target, 307);
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 3600,
  };
  res.cookies.set("hs-session", "PREVIEW", cookieOpts);
  res.cookies.set("hs-scope", scopeKey(DEFAULT_SCOPE), cookieOpts);
  return res;
}
