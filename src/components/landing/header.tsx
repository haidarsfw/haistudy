"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, Globe, Sun, Moon } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/components/landing/logo";
import { UserMenu } from "@/components/landing/user-menu";
import { useLandingTheme } from "@/components/landing/landing-shell";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#cara-kerja", key: "landing.nav.how" },
  { href: "#fitur", key: "landing.nav.features" },
  { href: "#banding", key: "landing.nav.compare" },
  { href: "#harga", key: "landing.nav.pricing" },
  { href: "#testimoni", key: "landing.nav.testimonials" },
  { href: "#faq", key: "landing.nav.faq" },
];

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {children}
    </button>
  );
}

/**
 * Language toggle. Two visual states crossfade in place (no element swap, no
 * blink): roomy "globe + code" at the top of the page, tighter "globe with a
 * transparent knockout + ID/EN badge" once the header condenses into its pill.
 * The button width animates on the same curve as the header so they move as one.
 */
function LanguageToggle({ compact }: { compact: boolean }) {
  const { locale, setLocale } = useTranslation();
  const onClick = () => setLocale(locale === "id" ? "en" : "id");
  const label =
    locale === "id" ? "Switch to English" : "Ganti ke Bahasa Indonesia";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{ width: compact ? 36 : 54 }}
      className="relative inline-flex h-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[width,color] duration-[440ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* top-of-page variant */}
      <span
        aria-hidden={compact}
        className={cn(
          "absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-semibold transition-opacity duration-300",
          compact ? "opacity-0" : "opacity-100"
        )}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{locale}</span>
      </span>

      {/* condensed (pill) variant — globe knockout + inset badge */}
      <span
        aria-hidden={!compact}
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          compact ? "opacity-100" : "opacity-0"
        )}
      >
        <Globe
          className="h-[18px] w-[18px]"
          style={{
            maskImage:
              "radial-gradient(circle at 80% 82%, transparent 6px, #000 7px)",
            WebkitMaskImage:
              "radial-gradient(circle at 80% 82%, transparent 6px, #000 7px)",
          }}
        />
        <span
          className="pointer-events-none absolute text-[8px] font-bold uppercase leading-none tracking-tight"
          style={{ left: 24, top: 24, transform: "translate(-50%, -50%)" }}
        >
          {locale}
        </span>
      </span>
    </button>
  );
}

function ThemeToggle() {
  const { resolved, toggle } = useLandingTheme();
  return (
    <IconBtn
      onClick={toggle}
      label={resolved === "dark" ? "Mode terang" : "Mode gelap"}
    >
      {resolved === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </IconBtn>
  );
}

export function Header() {
  const { t } = useTranslation();
  const { session } = useSession();
  const loggedIn = !!session && !session.isPreview;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "relative flex items-center gap-3 transition-all duration-[440ms] [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? "mx-3 mt-4 h-16 max-w-[60rem] rounded-full border border-border bg-background/50 px-5 shadow-xl shadow-black/5 backdrop-blur-2xl backdrop-saturate-150 sm:mt-5 sm:px-6 lg:mx-auto"
            : "mx-auto mt-0 h-20 max-w-7xl border-b border-transparent px-6 sm:px-10"
        )}
      >
        {/* logo (left) — flex-1 mirror of the actions side so the nav centers true */}
        <div className="flex flex-1 items-center">
          <a href="#beranda" aria-label="haistudy" className="shrink-0">
            <Logo markSize={24} wordClassName="text-lg" />
          </a>
        </div>

        {/* centered nav (lg+; tablet/mobile use the menu to avoid crowding) */}
        <nav className="hidden items-center justify-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(item.key)}
            </a>
          ))}
        </nav>

        {/* actions (right) — flex-1 mirror of the logo side */}
        <div className="flex flex-1 items-center justify-end">
          {/* lg+ */}
          <div className="hidden items-center gap-1 lg:flex">
            <ThemeToggle />
            <LanguageToggle compact={scrolled} />
            <span className="mx-1.5 h-5 w-px bg-border/60" aria-hidden="true" />
            {loggedIn ? (
              <UserMenu compact={scrolled} />
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {t("landing.cta.masuk")}
              </Link>
            )}
          </div>

          {/* tablet / mobile (< lg) */}
          <div className="flex items-center gap-0.5 lg:hidden">
            <ThemeToggle />
            <LanguageToggle compact={scrolled} />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* mobile panel */}
      {open && (
        <div className="mx-3 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-background/70 shadow-xl backdrop-blur-2xl backdrop-saturate-150 lg:hidden">
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                {t(item.key)}
              </a>
            ))}
            <div className="mt-1">
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="brand-gradient-bg block rounded-full px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t("landing.cta.dashboard")}
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-full border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  {t("landing.cta.masuk")}
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
