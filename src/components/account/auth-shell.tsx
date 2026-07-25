import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/landing/logo";

/**
 * The frame every auth page sits in: masuk, daftar, lupa password, reset,
 * verifikasi.
 *
 * One component rather than five near-identical pages, because the thing that
 * makes an auth flow feel trustworthy is that each step looks like the last
 * one. A form that shifts its card width or moves its heading between steps
 * reads as a different site.
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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-14">
      <div className="w-full max-w-sm">
        <Link
          href={backHref}
          className="mb-7 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="mb-6">
          <Wordmark className="text-2xl" />
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {intent}

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          {children}
        </div>

        {footer && (
          <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
        )}
      </div>
    </div>
  );
}

/**
 * "Kamu akan membeli VIP — Rp35.000", shown above the form when someone was
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
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
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
