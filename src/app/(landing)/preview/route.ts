import { NextResponse } from "next/server";
import { DEFAULT_SCOPE, scopeKey } from "@/lib/scope";

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
