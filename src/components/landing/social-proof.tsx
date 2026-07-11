"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { useTranslation } from "@/components/providers/language-provider";
import { BinusMark } from "@/components/landing/binus-mark";

// Total unique users since semester 1. Bump this (or wire to orders later).
const USER_COUNT = 312;

/**
 * Social-proof line. One smooth, long count-up. Campus logos carry the names;
 * the class details tuck into each logo's bottom-right. A soft light sits behind
 * the BINUS mark so its dark wordmark stays legible (no solid white box). One
 * row on desktop; stacks (count / logos / tagline) on mobile.
 */
export function SocialProof() {
  const { t } = useTranslation();
  const [n, setN] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const fire = () => {
      if (!done) {
        done = true;
        setN(USER_COUNT);
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) fire();
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    const tmr = setTimeout(fire, 2400);
    return () => {
      io.disconnect();
      clearTimeout(tmr);
    };
  }, []);

  const detail =
    "absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[8px] font-normal leading-none text-muted-foreground";
  const word = "text-lg font-light tracking-wide text-foreground sm:text-xl";

  return (
    <section aria-label="Bukti sosial" className="px-4 pb-6 pt-2 sm:pb-8">
      <div
        ref={ref}
        data-reveal
        className="mx-auto flex max-w-4xl flex-col items-center gap-y-4 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4 sm:gap-y-3"
      >
        {/* count + label. items-center (not baseline) so "mahasiswa" sits at the
            row's vertical center, level with "percaya haistudy". */}
        <div className="flex items-center gap-2.5">
          <span className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            <NumberFlow
              value={n}
              spinTiming={{ duration: 3000, easing: "cubic-bezier(0.16,1,0.3,1)" }}
            />
            <span className="text-brand-gradient">+</span>
          </span>
          <span className={word}>{t("landing.social.students")}</span>
        </div>

        {/* campus logos share one row height so both class details (absolute
            below) land on the same baseline; the flanking words stay aligned. */}
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="relative flex h-14 items-center sm:h-16">
            <BinusMark className="h-10 w-auto sm:h-12" />
            <span className={detail}>{t("landing.social.binus_detail")}</span>
          </span>

          <span className="text-lg font-light text-foreground sm:text-xl">&amp;</span>

          <span className="relative flex h-14 items-center sm:h-16">
            <Image
              src="/campus/unj.png"
              alt="Universitas Negeri Jakarta"
              width={512}
              height={512}
              className="h-10 w-auto object-contain sm:h-12"
            />
            <span className={detail}>{t("landing.social.unj_detail")}</span>
          </span>
        </div>

        {/* tagline */}
        <span className={word}>{t("landing.social.trust")}</span>
      </div>
    </section>
  );
}
