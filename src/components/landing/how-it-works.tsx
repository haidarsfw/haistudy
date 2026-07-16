"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/providers/language-provider";

// Placeholder cards sized EXACTLY like each demo's real container, so swapping
// the demo in causes zero layout shift.
const cardCls =
  "w-full rounded-2xl border border-border bg-card shadow-card";
function RangkumanSkeleton() {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5" aria-hidden="true">
      <div className={`${cardCls} h-[420px] sm:h-[460px] lg:col-span-3`} />
      <div className={`${cardCls} h-[420px] sm:h-[460px] lg:col-span-2`} />
    </div>
  );
}
function KilatSkeleton() {
  return <div className={`${cardCls} h-[480px] sm:h-[440px]`} aria-hidden="true" />;
}
function LatihanSkeleton() {
  return <div className={`${cardCls} h-[480px] sm:h-[440px]`} aria-hidden="true" />;
}

// The demos are the heaviest client JS on the page. Code-split them (ssr:false)
// so their chunks aren't in the initial bundle, and only mount them once the
// section nears the viewport — the animations never load off-screen.
const DemoRangkumanAI = dynamic(
  () => import("@/components/landing/demo-rangkuman").then((m) => ({ default: m.DemoRangkumanAI })),
  { ssr: false, loading: RangkumanSkeleton }
);
const DemoKilat = dynamic(
  () => import("@/components/landing/demo-kilat").then((m) => ({ default: m.DemoKilat })),
  { ssr: false, loading: KilatSkeleton }
);
const DemoLatihan = dynamic(
  () => import("@/components/landing/demo-latihan").then((m) => ({ default: m.DemoLatihan })),
  { ssr: false, loading: LatihanSkeleton }
);

/**
 * "How it works" — a bento of live, self-playing demos in the new design.
 * Top row: the linked Rangkuman → haistudy AI pair. Bottom row: Belajar Kilat
 * (swipe feed) + Latihan Soal (AI-graded exam / drill / flashcards).
 *
 * The section heading is always rendered (anchor #cara-kerja + SEO); the demo
 * bodies are deferred until the section is within 800px of the viewport, so their
 * (heavy) JS never loads for a visitor who doesn't scroll this far.
 */
export function HowItWorks() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="cara-kerja" className="scroll-mt-24 px-4 pb-16 pt-8 sm:pb-24 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.how.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            {t("landing.how.subtitle")}
          </p>
        </div>

        <div ref={ref} data-reveal className="mt-10 space-y-6" style={{ transitionDelay: "80ms" }}>
          {show ? <DemoRangkumanAI /> : <RangkumanSkeleton />}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-2">
              {show ? <DemoKilat /> : <KilatSkeleton />}
              <p className="mt-2.5 text-center text-xs italic leading-relaxed text-muted-foreground">
                {t("landing.how.kilat.desc")}
              </p>
            </div>
            <div className="min-w-0 lg:col-span-3">
              {show ? <DemoLatihan /> : <LatihanSkeleton />}
              <p className="mt-2.5 text-center text-xs italic leading-relaxed text-muted-foreground">
                {t("landing.how.latihan.desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
