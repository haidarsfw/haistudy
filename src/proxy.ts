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

const publicPaths = [
  "/",
  "/login",
  // Signing up, and the two mail links that lead back here. All four must stay
  // open: the whole point of the account layer is that identity exists before
  // any access does, and a verification link that first demands a sign-in is a
  // link nobody clicks.
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  // Same reason again, and it matters more here: someone confirming or
  // cancelling a deletion is often doing it from a phone they are not signed
  // in on, and the cancel link has to work for a full week.
  "/delete-account",
  "/cancel-deletion",
  "/preview",
  "/payments",
  // Where `/@nama` rewrites to. Public for the same reason /register is: the
  // person following a partner's link has no account yet.
  //
  // isPublicPath matches the bare string OR a `/`-prefix, and every real
  // request here is `/undangan/<handle>` — the bare path is never requested.
  // Listed anyway so the route stays public on purpose rather than by accident:
  // today it survives only because isAppRoute does not recognise the segment,
  // and anyone tightening that later would silently start bouncing invited
  // visitors to /login.
  "/undangan",
  "/api",
  "/privacy",
  "/terms",
  "/refund",
  "/auth/callback",
  "/unavailable",
  "/clearcookies",
];

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

// Production canonical host. All other hosts (Vercel deploy aliases, www) get
// 308-redirected here so cookies — especially the OAuth PKCE verifier — always
// live on ONE origin. Preview deploys + localhost are exempt (VERCEL_ENV check).
const CANONICAL_HOST = "haistudy.site";

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
  // /downloads/* files are auth-gated — never treat as public static
  if (pathname.startsWith("/downloads/")) return false;
  if (/\.\w+$/.test(pathname)) return true; // static files
  return false;
}

/**
 * Is this path one the app actually serves behind auth? Only these earn the
 * login redirect; anything else is a genuine 404. Keep in sync with the route
 * tree: the scoped `/s{N}/…` shape, the legacy unscoped aliases, and /admin.
 */
function isAppRoute(pathname: string, segs: string[]): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (/^s\d+$/.test(segs[0] ?? "")) return true;
  return LEGACY_APP_ROUTES.has(segs[0] ?? "");
}

function parseScopeCookie(raw: string | undefined): { sem: string; exam: string; jur: string } {
  // hs-scope now carries "<scope-key>~<stamp>" (see lib/auth/scope-cookie.ts).
  // Only the key matters here — this runs before any authorization and merely
  // decides where to send a legacy URL. Stripping is done inline rather than by
  // importing the helper, because that module reaches for node:crypto and this
  // one has to stay loadable in the proxy runtime.
  //
  // Without the strip the regex below rejects every stamped cookie and silently
  // falls back to the default period, which would land people in the wrong
  // exam period instead of their own.
  const bare = raw ? raw.split("~")[0] : raw;
  const value = bare && /^s\d+-(uts|uas)-[a-z0-9-]{1,16}$/.test(bare) ? bare : DEFAULT_SCOPE_COOKIE;
  const [semWithS, exam, jur] = value.split("-");
  return { sem: semWithS.replace(/^s/, ""), exam, jur };
}

export function proxy(request: NextRequest) {
  // 0. Canonicalize host in production so OAuth PKCE + all cookies share ONE
  //    origin. A non-canonical host (e.g. a *.vercel.app alias) 308-redirects to
  //    haistudy.site. Preview deploys (VERCEL_ENV !== "production") and
  //    localhost are left untouched so testing still works.
  if (process.env.VERCEL_ENV === "production") {
    const host = request.headers.get("host");
    // Localhost is genuinely exempt (local `next start` against prod env) so the
    // app is reachable when testing a production build — not just claimed exempt.
    const isLocalHost =
      !!host &&
      (host.startsWith("localhost") ||
        host.startsWith("127.0.0.1") ||
        host.startsWith("[::1]") ||
        host.startsWith("0.0.0.0"));
    if (host && host !== CANONICAL_HOST && !isLocalHost) {
      const dest = request.nextUrl.clone();
      dest.protocol = "https:";
      dest.host = CANONICAL_HOST;
      return NextResponse.redirect(dest, 308);
    }
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const segs = pathname.split("/").filter(Boolean);

  // 0b. An OAuth code that landed on the WRONG PATH.
  //
  //     Supabase only honours a `redirect_to` that is on its own allow-list. When
  //     it is not, it silently substitutes the project's Site URL and appends
  //     `?code=` — so the browser arrives at `/?code=…`, the landing page
  //     renders, and nothing at all happens. No error, no hint, and the code
  //     expires unused. That silence is the whole problem: it looks like the
  //     button did nothing.
  //
  //     Handing it to the callback turns that dead end into one of two honest
  //     outcomes — it signs the person in when the verifier does live on this
  //     origin, or it fails with a message that names the cause.
  //
  //     This is a net, not a cure. If the flow STARTED on another origin the
  //     verifier is stored over there and no amount of routing can move it; the
  //     real fix is adding the origin under
  //     Supabase → Authentication → URL Configuration → Redirect URLs.
  if (pathname === "/" && url.searchParams.has("code")) {
    const dest = new URL("/auth/callback", request.url);
    url.searchParams.forEach((v, k) => dest.searchParams.set(k, v));
    return NextResponse.redirect(dest);
  }

  // 0c. Partner links: `/@nama` → the invite handler.
  //
  //     It cannot be a route folder. The app owns the root dynamic segment
  //     (`(scoped)/[semester]`), and Next refuses a second slug name at the
  //     same level — `[handle]` next to `[semester]` is a build error. A
  //     rewrite sidesteps that entirely, and keeps the pretty URL the owner
  //     wants on an NFC card.
  //
  //     `@` cannot begin any real path, so nothing existing can collide.
  const partner = pathname.match(/^\/@([A-Za-z0-9_-]{2,32})$/);
  if (partner) {
    return NextResponse.rewrite(
      new URL(`/undangan/${encodeURIComponent(partner[1])}`, request.url)
    );
  }

  // 1. Public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2a. /account and /partner belong to the identity layer, not the app. Both
  //     are gated on hs-account (who you are), never on hs-session (what you
  //     bought) — someone with an account and no access must still be able to
  //     open them, since that is exactly where they go to buy one. A partner
  //     in particular often holds no licence at all for the period they teach.
  if (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/partner"
  ) {
    if (!request.cookies.get("hs-account")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Require session cookie — but only for paths that are actually app routes.
  //    A path that matches nothing is a 404, not a login prompt: bouncing
  //    strangers who mistyped a URL into a login wall is hostile, and it turned
  //    every dead marketing link into a soft-404 for crawlers (307 → /login,
  //    which answers 200). Falling through lets Next render not-found.tsx.
  const sessionFlag = request.cookies.get("hs-session");
  if (!sessionFlag) {
    if (!isAppRoute(pathname, segs)) {
      return NextResponse.next();
    }
    // Signed in, but nothing opened yet. Sending these people to /login was
    // the bug behind "login does nothing": they signed in, got sent back to
    // the dashboard, arrived without hs-session, and were bounced to /login
    // again. /enter is the only thing that can actually resolve this — it
    // opens the access (or asks about the device) and then forwards.
    if (request.cookies.get("hs-account")) {
      const enterUrl = new URL("/enter", request.url);
      enterUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(enterUrl);
    }
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
     * - api (ALL /api/* routes — the proxy only ever returns next() for them,
     *   and each API route self-guards via requireScope/getCaller. Running
     *   middleware on every API call was a wasted Vercel function invocation.)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|api|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
