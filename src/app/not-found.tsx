import { Compass } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { parseScopeKey, scopePath, DEFAULT_SCOPE } from "@/lib/scope";
import { scopeKeyFromCookie } from "@/lib/auth/scope-cookie";

/**
 * Root 404: handles both `notFound()` calls inside the app and any URL that
 * matches no route at all.
 *
 * Dressed exactly like the public pages (audit no. 32, owner's pick of
 * 2026-10-04): the same `.landing-root theme-dark` scope LandingShell opens, so
 * the background, brand gradient and button glow are the public ones, and
 * whoever lands on a wrong address still feels they are on haistudy.
 */
export default async function NotFound() {
  // Whoever is signed in almost certainly wants their dashboard, not the
  // marketing page. hs-scope is httpOnly, so this has to happen server-side.
  const jar = await cookies();
  const signedIn = !!jar.get("hs-session")?.value;
  // The stamp has to come off first, or this parses nothing and every signed-in
  // visitor gets pointed at DEFAULT_SCOPE instead of their own period.
  const scope =
    parseScopeKey(scopeKeyFromCookie(jar.get("hs-scope")?.value)) ?? DEFAULT_SCOPE;

  // scopePath() returns "s2/uts/bm" with no leading slash — every caller adds
  // its own. Without it this href is relative and resolves against the missing
  // path (/a/b/typo → /a/b/s2/uts/bm/dashboard).
  const primary = signedIn
    ? { href: `/${scopePath(scope)}/dashboard`, label: "Ke dashboard" }
    : { href: "/", label: "Ke beranda" };

  return (
    <div className="landing-root theme-dark flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="font-display text-4xl font-bold leading-none text-muted-foreground/70">
          404
        </p>
        {/* Icon beside the title, the same tile as the subject header
            (audit no. 27). */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Halaman ini gak ada
          </h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mungkin salah ketik, atau halamannya udah pindah. Gak ada yang rusak
          kok.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primary.href}
            className="brand-gradient-bg inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {primary.label}
          </Link>
          {signedIn && (
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              Beranda
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
