"use client";

import { Star } from "lucide-react";
import {
  TESTIMONIALS,
  TESTIMONIAL_RATING,
  type Testimonial,
} from "@/data/landing/testimonials";
import { cn } from "@/lib/utils";

/**
 * Social-proof marquee — two rows of real student testimonials scrolling in
 * opposite directions, paused on hover. Full-name + class/campus attribution,
 * ⭐ rating in the header. CSS-only animation (cheap, no JS rAF); reduced-motion
 * turns it into a plain horizontal scroll so nothing moves on its own.
 */

function Stars() {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${TESTIMONIAL_RATING.value} dari 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-[#f5b301] text-[#f5b301]" aria-hidden="true" />
      ))}
    </div>
  );
}

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
      <Stars />
      <blockquote className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3 pt-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
          {t.name.charAt(0)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground">{t.name}</span>
          <span className="block text-xs text-muted-foreground">
            {t.kelas ? `${t.kelas} · ` : ""}
            {t.campus}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

function Row({ items, dir }: { items: Testimonial[]; dir: "left" | "right" }) {
  return (
    <div
      className="group flex overflow-hidden motion-reduce:overflow-x-auto"
      style={{
        // inline: Lightning CSS strips a mask-image utility class in this repo
        maskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <div
        className={cn(
          "flex shrink-0 gap-4 pr-4",
          dir === "left" ? "hs-marquee" : "hs-marquee-rev"
        )}
      >
        {items.map((t) => (
          <Card key={t.name} t={t} />
        ))}
        {/* seamless duplicate */}
        {items.map((t) => (
          <Card key={`${t.name}-dup`} t={t} />
        ))}
      </div>
    </div>
  );
}

export function TestimonialMarquee() {
  const mid = Math.ceil(TESTIMONIALS.length / 2);
  const rowA = TESTIMONIALS.slice(0, mid);
  const rowB = TESTIMONIALS.slice(mid);

  return (
    <section id="testimoni" className="relative scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Apa yang mereka bilang?
        </h2>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Stars />
          <span>
            <span className="font-semibold text-foreground">
              {TESTIMONIAL_RATING.value}/{TESTIMONIAL_RATING.outOf}
            </span>{" "}
            dari mahasiswa BINUS
          </span>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <Row items={rowA} dir="left" />
        <Row items={rowB} dir="right" />
      </div>
    </section>
  );
}
