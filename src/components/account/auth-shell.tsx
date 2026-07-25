import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/landing/logo";

/**
 * The frame every auth page sits in: masuk, daftar, lupa password, reset,
 * verifikasi.
 *
 * Two shapes, not one. On a phone it is a single column. On a wide screen it
 * splits: the words on the left, the form on the right, both vertically
 * centred so nothing needs scrolling. The single narrow column was a phone
 * layout stretched onto a desktop — technically responsive, but it left a
 * 1400px screen mostly empty while still pushing the submit button below the
 * fold.
 *
 * The wordmark is a small marker here, not a headline. It is a sign-in page;
 * the visitor already knows whose site they are on, and a giant logo just
 * competes with the thing they came to do.
 */
export function AuthShell({
  title,
  subtitle,
  intent,
  children,
  footer,
  backHref = "/",
  backLabel = "Kembali",
}: {
  title: string;
  subtitle?: string;
  /** Optional strip above the card, e.g. "Kamu akan membeli VIP". */
  intent?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="relative min-h-screen px-5 py-6 lg:px-10 lg:py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 py-10 lg:min-h-[calc(100vh-7rem)] lg:flex-row lg:items-center lg:gap-16 lg:py-0">
        {/* Left on desktop, top on mobile. */}
        <div className="w-full lg:max-w-sm lg:flex-1">
          <Wordmark className="text-sm" />
          <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-foreground lg:mt-5 lg:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground lg:mt-3 lg:text-base">
              {subtitle}
            </p>
          )}
          {intent && <div className="mt-5">{intent}</div>}
        </div>

        <div className="w-full lg:max-w-md lg:flex-1">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            {children}
          </div>
          {footer && (
            <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "Kamu akan membeli VIP — Rp35.000", shown beside the form when someone was
 * sent here mid-purchase.
 *
 * Without it, being bounced to a signup page reads as losing your place. With
 * it, registering is visibly still part of buying the thing you just clicked.
 */
export function PurchaseIntent({
  packageLabel,
  price,
  changeHref = "/#harga",
}: {
  packageLabel: string;
  price: string;
  changeHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Kamu akan membeli
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {packageLabel} <span className="text-muted-foreground">·</span> {price}
        </p>
      </div>
      <Link
        href={changeHref}
        className="shrink-0 rounded text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        Ganti
      </Link>
    </div>
  );
}

/** "atau" rule between the Google button and the e-mail form. */
export function AuthDivider({ label = "atau" }: { label?: string }) {
  return (
    <div className="relative flex items-center" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
