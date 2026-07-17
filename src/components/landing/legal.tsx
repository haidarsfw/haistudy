import Link from "next/link";
import { ArrowLeft, Instagram, Mail, MessageCircle } from "lucide-react";
import { SupportEmail } from "@/components/landing/support-email";

// Shared shell for the legal pages (/privacy, /terms). Standalone like /refund:
// no landing header/footer, narrow measure, its own back link. Deliberately does
// NOT use `prose dark:prose-invert` — the `dark:` variant keys off `html.dark`,
// but the landing is dark-only via `.landing-root.theme-dark`, so prose would
// render light-theme text on the dark surface for any visitor whose app theme
// isn't dark.

export function LegalPage({
  title,
  updated,
  intro,
  children,
  footer,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-6 lg:py-16">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Terakhir diperbarui: {updated}
      </p>

      <p className="mt-6 text-sm leading-relaxed text-foreground/80 sm:text-[15px]">
        {intro}
      </p>

      <div className="mt-10 space-y-8">{children}</div>

      {footer}
    </div>
  );
}

export function LegalSection({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 text-sm leading-relaxed text-foreground/80">
      <h2 className="font-display text-lg font-semibold text-foreground">
        <span className="text-muted-foreground/60">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-primary/50">
      {children}
    </ul>
  );
}

const WA_NUMBER = "6287839256171";
const IG_URL = "https://instagram.com/haidarsfw";

/** Contact block shared by both legal pages. `n` differs per page. */
export function LegalContact({ n, waText }: { n: number; waText: string }) {
  const wa = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`;
  return (
    <LegalSection n={n} title="Kontak">
      <p>Ada pertanyaan atau mau melaporkan sesuatu? Hubungi kami lewat:</p>
      <ul className="space-y-2 pt-1">
        <li className="flex flex-wrap items-center gap-1.5">
          <MessageCircle className="h-4 w-4 shrink-0 text-primary" />
          <span>WhatsApp:</span>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            0878-3925-6171
          </a>
        </li>
        {/* SupportEmail renders a <div>, so this row is a flex container, never a <p>. */}
        <li className="flex flex-wrap items-center gap-1.5">
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          <span>Email:</span>
          <SupportEmail />
        </li>
        <li className="flex flex-wrap items-center gap-1.5">
          <Instagram className="h-4 w-4 shrink-0 text-primary" />
          <span>Instagram:</span>
          <a
            href={IG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            @haidarsfw
          </a>
        </li>
      </ul>
      <p>
        Kamu juga bisa langsung pakai fitur Live Chat di dalam platform kalau
        kamu sudah punya akses.
      </p>
    </LegalSection>
  );
}

/** Cross-links to the sibling legal pages. */
export function LegalFooterNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  return (
    <p className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-border pt-6 text-xs text-muted-foreground">
      <span>Baca juga:</span>
      {links.map((l, i) => (
        <span key={l.href} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden className="text-muted-foreground/40">
              ·
            </span>
          )}
          <Link
            href={l.href}
            className="text-primary underline-offset-4 hover:underline"
          >
            {l.label}
          </Link>
        </span>
      ))}
    </p>
  );
}
