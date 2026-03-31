import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection proxy (Next.js 16).
 * - Public routes: landing, login, preview, API, static assets
 * - Protected routes: /dashboard, /subject/*, /voice, /settings, /admin
 *
 * Since we use license-key auth (not Supabase Auth), we check for the
 * presence of a session cookie/header. Actual validation happens server-side.
 */

const publicPaths = ["/", "/login", "/preview", "/api", "/privacy", "/terms"];

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.\w+$/.test(pathname)) return true; // static files
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // For protected routes, check for session in cookie
  // The session is stored client-side in localStorage, but we also
  // set a lightweight cookie flag for middleware-level checks
  const sessionFlag = request.cookies.get("hs-session");

  if (!sessionFlag) {
    // Redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection - check admin flag cookie
  if (pathname.startsWith("/admin")) {
    const adminFlag = request.cookies.get("hs-admin");
    if (!adminFlag || adminFlag.value !== "1") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
