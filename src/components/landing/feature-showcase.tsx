"use client";

import Link from "next/link";
import {
  Megaphone,
  MessagesSquare,
  Music,
  Palette,
  CalendarClock,
  TrendingUp,
  Timer,
  Bookmark,
  FileText,
  Zap,
  ListChecks,
  Bot,
  ArrowRight,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";

/**
 * Feature showcase — the compact section that follows the live demos.
 *
 * Heading matches "How it works" in size; the body stays low-height. A recap
 * chip row names the demoed features, then a tight grid covers the OTHER real
 * features (neutral icon + a tiny feature-specific micro-visual, so it never
 * reads as a generic icon grid, and stays easy on the eyes — colour is used
 * sparingly), closed by a marketing preview CTA. The title reads on its own so
 * a header "Fitur" jump still makes sense without the demos above.
 */

type Kind =
  | "announce"
  | "community"
  | "music"
  | "custom"
  | "jadwal"
  | "stats"
  | "focus"
  | "bookmark";

const RECAP: { icon: LucideIcon; key: string }[] = [
  { icon: FileText, key: "landing.features.recap.rangkuman" },
  { icon: Zap, key: "landing.features.recap.kilat" },
  { icon: ListChecks, key: "landing.features.recap.latihan" },
  { icon: Bot, key: "landing.features.recap.ai" },
];

const CARDS: { icon: LucideIcon; kind: Kind; titleKey: string; descKey: string }[] = [
  { icon: Megaphone, kind: "announce", titleKey: "landing.features.announce.title", descKey: "landing.features.announce.desc" },
  { icon: MessagesSquare, kind: "community", titleKey: "landing.features.community.title", descKey: "landing.features.community.desc" },
  { icon: Music, kind: "music", titleKey: "landing.features.music.title", descKey: "landing.features.music.desc" },
  { icon: Palette, kind: "custom", titleKey: "landing.features.custom.title", descKey: "landing.features.custom.desc" },
  { icon: CalendarClock, kind: "jadwal", titleKey: "landing.features.jadwal.title", descKey: "landing.features.jadwal.desc" },
  { icon: TrendingUp, kind: "stats", titleKey: "landing.features.stats.title", descKey: "landing.features.stats.desc" },
  { icon: Timer, kind: "focus", titleKey: "landing.features.focus.title", descKey: "landing.features.focus.desc" },
  { icon: Bookmark, kind: "bookmark", titleKey: "landing.features.bookmark.title", descKey: "landing.features.bookmark.desc" },
];

/** Tiny, feature-specific accent under each card's text. Neutral by default,
 *  colour only where it carries meaning (live dot, online dot, theme swatches). */
function Visual({ kind, t }: { kind: Kind; t: (k: string) => string }) {
  switch (kind) {
    case "announce":
      return (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1">
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/50 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          <span className="truncate text-[10px] text-muted-foreground">
            {t("landing.features.announce.sample")}
          </span>
        </div>
      );
    case "community":
      return (
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="flex h-4 w-4 items-center justify-center rounded-full border border-card bg-muted text-muted-foreground"
              >
                <User className="h-2.5 w-2.5" />
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("landing.features.community.online")}
          </span>
        </div>
      );
    case "music":
      return (
        <div className="flex h-4 items-end gap-[3px]">
          {[7, 12, 5, 10, 6].map((h, i) => (
            <span
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-primary/70 motion-safe:animate-[hs-eq_0.9s_ease-in-out_infinite]"
              style={{ height: h, animationDelay: `${i * 0.12}s` }}
            />
          ))}
          <span className="ml-1 text-[10px] text-muted-foreground">lofi</span>
        </div>
      );
    case "custom":
      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-rose-500"].map((c) => (
              <span key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
            ))}
          </div>
          <span className="font-display text-xs font-semibold text-foreground">Aa</span>
          <span className="rounded bg-muted/60 px-1 py-0.5 text-[8px] font-semibold tracking-wide text-muted-foreground">
            ID/EN
          </span>
        </div>
      );
    case "jadwal":
      return (
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-base font-bold text-destructive motion-safe:[animation:urgent-pulse_2.6s_ease-in-out_infinite]">
            H-3
          </span>
          <span className="text-[10px] text-muted-foreground">
            {t("landing.features.jadwal.sample")}
          </span>
        </div>
      );
    case "stats":
      return (
        <div className="flex h-4 items-end gap-1">
          {[40, 62, 48, 78].map((h, i) => (
            <span key={i} className="w-1.5 rounded-sm bg-foreground/25" style={{ height: `${h}%` }} />
          ))}
        </div>
      );
    case "focus":
      return (
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-base font-bold tabular-nums text-foreground">25:00</span>
          <span className="text-[10px] text-muted-foreground">
            {t("landing.features.focus.sample")}
          </span>
        </div>
      );
    case "bookmark":
      return (
        <div className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
          <Bookmark className="h-2.5 w-2.5 text-muted-foreground" />
          {t("landing.features.bookmark.sample")}
        </div>
      );
  }
}

export function FeatureShowcase() {
  const { t } = useTranslation();

  return (
    <section id="fitur" className="scroll-mt-24 px-4 pb-10 pt-2 sm:pb-14 sm:pt-4">
      <div className="mx-auto max-w-5xl">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.features.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            {t("landing.features.subtitle")}
          </p>
        </div>

        {/* recap chips — the features already shown live above */}
        <div
          data-reveal
          className="mt-7 flex flex-col items-center gap-2.5"
          style={{ transitionDelay: "60ms" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
            {t("landing.features.recap_label")}
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {RECAP.map(({ icon: Icon, key }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground"
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        {/* the other real features — tight grid */}
        <div
          data-reveal
          className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4"
          style={{ transitionDelay: "120ms" }}
        >
          {CARDS.map(({ icon: Icon, kind, titleKey, descKey }) => (
            <article
              key={kind}
              className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-3 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-foreground/70" />
                <h3 className="font-display text-[13px] font-semibold leading-tight text-foreground">
                  {t(titleKey)}
                </h3>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
                {t(descKey)}
              </p>
              <div className="mt-auto pt-2.5">
                <Visual kind={kind} t={t} />
              </div>
            </article>
          ))}
        </div>

        {/* preview CTA — marketing, low friction */}
        <div
          data-reveal
          className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/30 px-5 py-4 text-center sm:flex-row sm:gap-4 sm:text-left"
          style={{ transitionDelay: "180ms" }}
        >
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-foreground">
              {t("landing.features.more.title")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("landing.features.more.sub")}
            </p>
          </div>
          <Link
            href="/preview"
            className="brand-gradient-bg inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white shadow-md shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:ml-auto"
          >
            {t("landing.features.more.cta")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
