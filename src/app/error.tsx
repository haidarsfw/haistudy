"use client";

import { useEffect } from "react";
import { RotateCw, TriangleAlert } from "lucide-react";
import { logError } from "@/lib/error-logging";

/**
 * Root error boundary — shared by the landing and the app.
 *
 * Shape follows the landing, colours come from theme tokens: this renders
 * OUTSIDE `.landing-root`, where the landing's `--brand-gradient` is undefined.
 *
 * No dashboard link here (unlike not-found): the boundary is a Client Component,
 * and `hs-scope` is httpOnly, so the scope can't be read. "Coba lagi" is the
 * real action anyway — most of these are transient.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error.message, error.stack);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/10">
          <TriangleAlert className="h-6 w-6 text-destructive" />
        </div>

        <h1 className="font-display text-xl font-bold text-foreground">
          Ada yang error
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Bukan salah kamu. Coba muat ulang dulu, biasanya langsung beres.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RotateCw className="h-4 w-4" />
            Coba lagi
          </button>
          {/* Plain <a>, not <Link>: this is the escape hatch from a crashed
              render, so it must be a real navigation that resets client state
              rather than a client-side one through the router that just blew up. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            Beranda
          </a>
        </div>

        {/* Give the user something to quote to admin. Nothing else surfaces it. */}
        {error.digest && (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground/70">
            Kode error: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
