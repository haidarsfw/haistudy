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
      {/* Vertically centred, and the min-height is what keeps it honest: the
          row is at least a screen tall, so it does NOT resize when the card
          grows a little (opening the referral field). Without that floor, both
          columns would be averaged against each other and the words on the
          left would slide every time the form changed height. */}
      {/* The phone layout used to start almost against the browser chrome.
          A viewport-relative top gap lets it breathe on a tall screen without
          pushing the button off a short one; desktop keeps its own centring. */}
      <div className="mx-auto flex w-full max-w-5xl flex-col justify-center gap-8 pb-12 pt-[7vh] lg:min-h-[calc(100vh-9rem)] lg:flex-row lg:items-center lg:gap-16 lg:py-0">
        <div className="w-full lg:max-w-sm lg:flex-1">
          {/* Directly above the words it returns from, not pinned to the far
              corner of the page. On a centred layout a top-left back link ends
              up hundreds of pixels from the only content on screen, which is
              why it read as decoration. Small and quiet: it is an escape
              hatch, not one of the two things you came here to do. */}
          {/* On a phone the two columns stack, so a mark sitting above the
              card would land halfway down the page again — adrift, which is
              exactly what it looked like before. It belongs at the top of the
              screen on mobile and beside the card on desktop, so it is
              rendered in both places and only one is ever visible. */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 rounded text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
            <Wordmark className="text-sm lg:hidden" />
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground lg:text-4xl">
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
          {/* Desktop only. The mobile copy lives up beside the back link. */}
          <div className="mb-3 hidden justify-end lg:flex">
            <Wordmark className="text-sm" />
          </div>
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

/**
 * The card's own heading.
 *
 * The card used to open straight onto a full-width Google button, which left
 * the top of it looking unfinished and gave the eye nothing to land on. Every
 * comparable product — Vercel, Linear, Figma, Notion, Stripe, Supabase — puts
 * a heading inside the card; not one of them ships a headless one.
 *
 * It is an `h2`, not an `h1`, and it names the TASK ("Buat akun") while the
 * page heading beside it sells the idea. Same words at two sizes would just be
 * the redundancy in a different place.
 */
export function AuthCardHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    // Centred, matching the buttons and the footer link under it. Left-aligned
    // it was the only thing in the card pulling to one side.
    <div className="mb-1 text-center">
      <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      {hint && (
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>
      )}
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
