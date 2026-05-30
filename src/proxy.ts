import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection proxy (Next.js 16 renamed middleware → proxy).
 * Responsibilities:
 *  1. Public paths pass through
 *  2. Unauthenticated → /login
 *  3. /admin requires hs-admin=1 cookie
 *  4. Legacy unscoped app paths (/dashboard, /subject, …) → 308 redirect
 *     into the user's scoped tree (/s{N}/{uts|uas}/{jurusan}/…) using
 *     the hs-scope cookie. Default fallback s2-uts-bm.
 *  5. Already-scoped paths pass through untouched.
 */

const publicPaths = ["/", "/login", "/preview", "/api", "/privacy", "/terms", "/auth/callback"];

const LEGACY_APP_ROUTES = new Set([
  "dashboard",
  "subjects",
  "subject",
  "bookmarks",
  "notes",
  "analytics",
  "feedback",
  "jadwal-uts",
  "voice",
  "settings",
]);

const DEFAULT_SCOPE_COOKIE = "s2-uts-bm";

// Next metadata routes are extensionless yet must stay crawlable (OG image,
// favicons, robots, sitemap). Without these, the proxy 307s social/crawler
// fetches to /login and breaks link previews + indexing.
const metadataRoutes = new Set([
  "/opengraph-image",
  "/twitter-image",
  "/icon",
  "/apple-icon",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.json",
]);

function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true;
  if (metadataRoutes.has(pathname)) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (/\.\w+$/.test(pathname)) return true; // static files
  return false;
}

function parseScopeCookie(raw: string | undefined): { sem: string; exam: string; jur: string } {
  const value = raw && /^s\d+-(uts|uas)-[a-z0-9-]{1,16}$/.test(raw) ? raw : DEFAULT_SCOPE_COOKIE;
  const [semWithS, exam, jur] = value.split("-");
  return { sem: semWithS.replace(/^s/, ""), exam, jur };
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const segs = pathname.split("/").filter(Boolean);

  // 1. Public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2. Require session cookie
  const sessionFlag = request.cookies.get("hs-session");
  if (!sessionFlag) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Admin guard
  if (pathname.startsWith("/admin")) {
    const adminFlag = request.cookies.get("hs-admin");
    if (!adminFlag || adminFlag.value !== "1") {
      const { sem, exam, jur } = parseScopeCookie(request.cookies.get("hs-scope")?.value);
      url.pathname = `/s${sem}/${exam}/${jur}/dashboard`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 4. Already in scoped tree?
  if (/^s\d+$/.test(segs[0] ?? "")) {
    // bookmarks merged into the unified Library page → redirect scoped /bookmarks.
    if (segs[3] === "bookmarks") {
      url.pathname = `/${segs[0]}/${segs[1]}/${segs[2]}/library`;
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  // 5. Legacy unscoped path → 308 into user's scoped tree
  if (LEGACY_APP_ROUTES.has(segs[0] ?? "")) {
    const { sem, exam, jur } = parseScopeCookie(request.cookies.get("hs-scope")?.value);
    // jadwal-uts → jadwal (renamed in the scoped tree);
    // bookmarks → library (merged into the unified Library page).
    const tail =
      segs[0] === "jadwal-uts"
        ? ["jadwal", ...segs.slice(1)]
        : segs[0] === "bookmarks"
          ? ["library"]
          : segs;
    url.pathname = `/s${sem}/${exam}/${jur}/${tail.join("/")}`;
    return NextResponse.redirect(url, 308);
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
