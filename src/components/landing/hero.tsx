"use client";

import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { HeroTour } from "@/components/landing/hero-tour";

export function Hero() {
  const { t } = useTranslation();
  const { session } = useSession();
  const loggedIn = !!session && !session.isPreview;

  return (
    <section
      id="beranda"
      className="relative overflow-hidden px-4 pb-10 pt-32 sm:pt-40"
    >
      {/* Layered background depth: grid + soft brand glows + bottom fade.
          Static + subtle (masked), not animated aurora. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-[-16%] h-[560px] w-[min(950px,94vw)] -translate-x-1/2 rounded-full blur-[64px] sm:blur-[120px]"
          style={{
            background: "radial-gradient(circle, var(--brand-1), transparent 66%)",
            opacity: "calc(var(--hs-glow) * 2.6)",
          }}
        />
        <div
          className="absolute left-[2%] top-[18%] h-[340px] w-[340px] rounded-full blur-[52px] sm:blur-[90px]"
          style={{
            background: "radial-gradient(circle, var(--brand-2), transparent 68%)",
            opacity: "calc(var(--hs-glow) * 1.7)",
          }}
        />
        <div
          className="absolute right-[2%] top-[24%] h-[380px] w-[380px] rounded-full blur-[52px] sm:blur-[90px]"
          style={{
            background: "radial-gradient(circle, var(--brand-1), transparent 68%)",
            opacity: "calc(var(--hs-glow) * 1.5)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto w-full max-w-6xl text-center">
        <h1
          data-reveal
          className="font-display mx-auto max-w-3xl text-balance text-[2.6rem] font-bold leading-[1.04] tracking-[-0.035em] text-foreground sm:text-6xl lg:text-[4.25rem]"
        >
          {t("landing.hero.headline_1")}{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span className="relative z-[1]">{t("landing.hero.headline_hl")}</span>
            <span
              aria-hidden="true"
              className="brand-gradient-bg absolute inset-x-[-0.09em] bottom-[0.1em] top-[0.24em] -z-0 -rotate-[1.4deg] rounded-[0.12em] opacity-[0.28]"
            />
          </span>
          .
        </h1>

        <p
          data-reveal
          className="mx-auto mt-8 max-w-xl text-pretty text-base text-muted-foreground sm:mt-10 sm:text-lg"
          style={{ transitionDelay: "60ms" }}
        >
          {t("landing.hero.sub")}
        </p>

        <div
          data-reveal
          className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
          style={{ transitionDelay: "120ms" }}
        >
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="brand-gradient-bg inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("landing.cta.dashboard")}
            </Link>
          ) : (
            <a
              href="#harga"
              className="brand-gradient-bg inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {t("landing.cta.daftar")}
            </a>
          )}
          <a
            href="#cara-kerja"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"
          >
            <span className="border-b border-transparent transition-colors group-hover:border-foreground/40">
              {t("landing.hero.see_action")}
            </span>
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>

        <a
          href="#testimoni"
          data-reveal
          className="group mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground"
          style={{ transitionDelay: "180ms" }}
        >
          <span className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-[#f5b301] text-[#f5b301]" aria-hidden="true" />
            ))}
          </span>
          <span>
            <strong className="font-semibold text-foreground">4.8</strong>/5
          </span>
          <span className="h-4 w-px bg-border" />
          <span className="text-foreground">{t("landing.hero.count")}</span>
          <span className="h-4 w-px bg-border" />
          <span className="border-b border-transparent transition-colors group-hover:border-foreground/40 group-hover:text-foreground">
            {t("landing.hero.trusted")}
          </span>
        </a>
      </div>

      {/* product preview — live, self-playing dashboard tour */}
      <div
        data-reveal
        className="mx-auto mt-14 max-w-4xl sm:mt-16"
        style={{ transitionDelay: "240ms" }}
      >
        <HeroTour />
      </div>
    </section>
  );
}
