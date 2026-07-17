import { Compass } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { parseScopeKey, scopePath, DEFAULT_SCOPE } from "@/lib/scope";

/**
 * Root 404 — handles both `notFound()` calls inside the app and any URL that
 * matches no route at all.
 *
 * Shape follows the landing (font-display, pill buttons, casual copy) but every
 * colour comes from theme tokens: this file renders OUTSIDE `.landing-root`, so
 * the landing's `--brand-gradient` doesn't exist here and `brand-gradient-bg`
 * would paint nothing. Tokens also let the page sit correctly inside the app,
 * whose accent the user can change.
 */
export default async function NotFound() {
  // Whoever is signed in almost certainly wants their dashboard, not the
  // marketing page. hs-scope is httpOnly, so this has to happen server-side.
  const jar = await cookies();
  const signedIn = !!jar.get("hs-session")?.value;
  const scope = parseScopeKey(jar.get("hs-scope")?.value) ?? DEFAULT_SCOPE;

  // scopePath() returns "s2/uts/bm" with no leading slash — every caller adds
  // its own. Without it this href is relative and resolves against the missing
  // path (/a/b/typo → /a/b/s2/uts/bm/dashboard).
  const primary = signedIn
    ? { href: `/${scopePath(scope)}/dashboard`, label: "Ke dashboard" }
    : { href: "/", label: "Ke beranda" };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
          <Compass className="h-6 w-6 text-muted-foreground" />
        </div>

        <p className="font-display text-4xl font-bold leading-none text-muted-foreground/40">
          404
        </p>
        <h1 className="font-display text-xl font-bold text-foreground">
          Halaman ini gak ada
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Mungkin salah ketik, atau halamannya udah pindah. Gak ada yang rusak
          kok.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primary.href}
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
