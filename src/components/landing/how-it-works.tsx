"use client";

import { useTranslation } from "@/components/providers/language-provider";
import { DemoRangkumanAI } from "@/components/landing/demo-rangkuman";
import { DemoKilat } from "@/components/landing/demo-kilat";
import { DemoLatihan } from "@/components/landing/demo-latihan";

/**
 * "How it works" — a bento of live, self-playing demos in the new design.
 * Top row: the linked Rangkuman → haistudy AI pair. Bottom row: Belajar Kilat
 * (swipe feed) + Latihan Soal (AI-graded exam / drill / flashcards).
 */
export function HowItWorks() {
  const { t } = useTranslation();
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

        <div data-reveal className="mt-10 space-y-6" style={{ transitionDelay: "80ms" }}>
          <DemoRangkumanAI />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-2">
              <DemoKilat />
              <p className="mt-2.5 text-center text-xs italic leading-relaxed text-muted-foreground">
                {t("landing.how.kilat.desc")}
              </p>
            </div>
            <div className="min-w-0 lg:col-span-3">
              <DemoLatihan />
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
