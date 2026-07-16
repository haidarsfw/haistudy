"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Crown, Gem } from "lucide-react";
import { PACKAGES, formatIDR } from "@/lib/payments";
import { useTranslation } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Landing pricing — bespoke, decoupled from the /payments PackageCard.
 *
 * Every card is a SOLID surface (a card colour lifted with a touch of foreground
 * via color-mix, so it never reads transparent against the near-black page). The
 * premium tiers sell themselves: VIP wears a warm gold gradient wash + glow,
 * Diamond an icy blue/indigo one — filled gradients, not flat colour outlines.
 * Share/Normal stay a clean neutral surface.
 *
 * Pick-then-buy: a card click SELECTS; the selected card's CTA proceeds. Feature
 * lists are generalised; only Normal carries "& masih banyak lagi" → a popup with
 * the full real list, since everyone gets every core feature (VIP/Diamond only
 * add exclusivity + customisation).
 */

type Feat = { key: string; badge?: "vip" | "diamond" };

const CARD_FEATURES: Record<string, Feat[]> = {
  normal: [
    { key: "pricing.gnorm_content" },
    { key: "pricing.gnorm_practice" },
    { key: "pricing.feat_ai" },
    { key: "pricing.gnorm_community" },
  ],
  vip: [
    { key: "pricing.feat_all_normal" },
    { key: "pricing.gvip_ai" },
    { key: "pricing.gvip_perks" },
    { key: "pricing.gvip_custom" },
    { key: "pricing.feat_vip_badge", badge: "vip" },
  ],
  diamond: [
    { key: "pricing.feat_all_vip" },
    { key: "pricing.feat_name_glow" },
    { key: "pricing.feat_support_dev" },
    { key: "pricing.feat_diamond_badge", badge: "diamond" },
  ],
};

// The full "& masih banyak lagi" list — every core feature a user gets, well
// beyond the four generalised lines on the Normal card. Shown in the popup so it
// reveals what ISN'T already on the front, not a repeat of it.
const ALL_FEATURES: { group: string; items: string[] }[] = [
  {
    group: "Materi & belajar",
    items: [
      "Rangkuman lengkap tiap mata kuliah",
      "Belajar Kilat (mode swipe)",
      "Latihan Soal esai & PG + koreksi AI",
      "Quiz & flashcards interaktif",
    ],
  },
  {
    group: "AI",
    items: [
      "haistudy AI 24/7 (tanya materi apa aja)",
      "AI dilatih materi resmi, ga halusinasi",
    ],
  },
  {
    group: "Komunitas",
    items: [
      "Forum & chat kelas",
      "Voice room belajar bareng",
      "Pengumuman & kisi-kisi real-time",
    ],
  },
  {
    group: "Produktivitas",
    items: [
      "Jadwal kuliah + countdown ujian",
      "Alat fokus (pomodoro + reminder)",
      "Statistik belajar",
      "Bookmark & catatan cepat",
    ],
  },
  {
    group: "Personalisasi",
    items: ["Tema, warna & font", "Musik lofi + playlist sendiri"],
  },
];

// Per-tier look. Each card is a DARK, saturated tinted surface (the accent mixed
// into a near-black base, kept dark) — colour comes from the SURFACE + border +
// glow + checks, never from a light wash that would brighten the card. Share
// teal, Normal emerald, VIP gold, Diamond icy (VIP/Diamond a touch more colour).
// `wash` is only a faint top gloss now. `cta` colours the selected buy button.
const TIER: Record<
  string,
  { surface: string; wash: string; border: string; glow: string; ctaBg: string; ctaGlow: string; check: string }
> = {
  // Share = cooler TEAL, understated (budget tier). Normal = brand EMERALD,
  // fuller (the solid base). Distinct hues + intensity so they never twin.
  // Washes carry a colour FLOOR (no fade to transparent) so the hue reads
  // across the whole card, and the borders are boldly saturated — colour on a
  // dark surface, not a pale sliver at the top.
  share: {
    surface: "color-mix(in oklab, #0b100e 91%, #2dd4bf)",
    wash: "",
    border: "border-teal-500/25",
    glow: "shadow-[0_16px_40px_-28px_rgba(20,184,166,0.16)]",
    ctaBg: "bg-gradient-to-b from-teal-500 to-teal-600",
    ctaGlow: "shadow-lg shadow-teal-500/40 hover:shadow-xl hover:shadow-teal-500/50",
    check: "text-teal-400",
  },
  normal: {
    surface: "color-mix(in oklab, #0b100e 89%, #10b981)",
    wash: "",
    border: "border-emerald-500/32",
    glow: "shadow-[0_16px_40px_-28px_rgba(16,185,129,0.18)]",
    ctaBg: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    ctaGlow: "shadow-lg shadow-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/50",
    check: "text-emerald-400",
  },
  // VIP gold + Diamond icy — still DARK, just a hint warmer/cooler than the rest.
  vip: {
    surface: "color-mix(in oklab, #0d0a05 89%, #f59e0b)",
    wash: "",
    border: "border-amber-500/38",
    glow: "shadow-[0_18px_44px_-24px_rgba(245,158,11,0.24)]",
    ctaBg: "bg-gradient-to-b from-amber-500 to-amber-600",
    ctaGlow: "shadow-lg shadow-amber-500/40 hover:shadow-xl hover:shadow-amber-500/50",
    check: "text-amber-400",
  },
  diamond: {
    surface: "color-mix(in oklab, #080b10 89%, #38bdf8)",
    wash: "",
    border: "border-sky-400/35",
    glow: "shadow-[0_18px_44px_-24px_rgba(56,189,248,0.22)]",
    ctaBg: "bg-gradient-to-b from-sky-500 to-blue-600",
    ctaGlow: "shadow-lg shadow-sky-500/40 hover:shadow-xl hover:shadow-sky-500/50",
    check: "text-sky-400",
  },
};

/** The real in-app tier badge (as shown next to names in chat & forum). */
function TierBadge({ tier }: { tier: "vip" | "diamond" }) {
  return tier === "vip" ? (
    <Badge variant="vip-outline" className="gap-0.5 px-1.5 py-0 text-[10px]">
      <Crown className="h-2.5 w-2.5" />
      VIP
    </Badge>
  ) : (
    <Badge variant="diamond-outline" className="gap-0.5 px-1.5 py-0 text-[10px]">
      <Gem className="h-2.5 w-2.5" />
      Diamond
    </Badge>
  );
}

export function PricingSection() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(
    () => PACKAGES.find((p) => p.highlight)?.id ?? "normal"
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="relative px-4 pb-20 pt-8 sm:pb-24 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("pricing.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            {t("pricing.subtitle")}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {PACKAGES.map((pkg) => {
            const isSelected = selected === pkg.id;
            const popular = !!pkg.highlight;
            const tier = TIER[pkg.id];
            const feats = CARD_FEATURES[pkg.id];

            return (
              <div
                key={pkg.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => setSelected(pkg.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(pkg.id);
                  }
                }}
                // per-tier DARK tinted surface, inline so twMerge can't drop it
                // against the wash gradient (both would be bg-*).
                style={{ backgroundColor: tier.surface }}
                className={cn(
                  "group relative flex cursor-pointer flex-col rounded-2xl border p-5 shadow-xl shadow-black/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  tier.wash,
                  tier.border,
                  tier.glow,
                  // the SELECTED card is the one that rises (default = VIP)
                  isSelected
                    ? "shadow-2xl ring-2 ring-foreground/25 lg:-translate-y-2"
                    : "hover:-translate-y-1 hover:shadow-2xl"
                )}
              >
                {/* name + quiet populer badge (neutral, recommended tier only) */}
                <div className="flex min-h-6 items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {t(pkg.nameKey)}
                  </h3>
                  {popular && (
                    <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
                      {t("pricing.popular")}
                    </span>
                  )}
                </div>

                {/* price */}
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-display text-[30px] font-bold leading-none tracking-tight text-foreground">
                    {formatIDR(pkg.price)}
                  </span>
                  <span className="pb-0.5 text-[11px] text-muted-foreground">
                    / {t("pricing.per_duration")}
                  </span>
                </div>

                {/* real short tagline */}
                <p className="mt-3 min-h-[2.5rem] text-xs leading-relaxed text-muted-foreground">
                  {t(pkg.shortKey)}
                </p>

                {/* features */}
                <div className="mt-1 border-t border-border/50 pt-4">
                  {pkg.id === "share" ? (
                    <>
                      <p className="text-[13px] leading-relaxed text-foreground/90">
                        {t("pricing.share_all_normal")}
                      </p>
                      <span className="mt-3 inline-flex w-fit rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t("pricing.note_share")}
                      </span>
                    </>
                  ) : (
                    <ul className="space-y-2">
                      {feats?.map((f) => (
                        <li
                          key={f.key}
                          className="flex items-start gap-2 text-[13px] text-foreground/90"
                        >
                          <Check
                            className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tier.check)}
                            strokeWidth={2.75}
                          />
                          {f.badge ? (
                            <span className="flex flex-wrap items-center gap-1.5 leading-snug">
                              {t("pricing.badge_label")}
                              <TierBadge tier={f.badge} />
                            </span>
                          ) : (
                            <span className="leading-snug">{t(f.key)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Normal only: "& masih banyak lagi" → full-feature popup */}
                  {pkg.id === "normal" && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialogOpen(true);
                        }}
                        className="inline-flex items-center text-[12px] font-semibold text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                      >
                        {t("pricing.more_all")}
                      </button>
                      <p className="mt-1 text-[10px] italic leading-snug text-muted-foreground/70">
                        {t("pricing.more_note")}
                      </p>
                    </div>
                  )}
                </div>

                {/* bottom-pinned group keeps device line + CTA aligned across cards */}
                <div className="mt-auto pt-5">
                  <span className="block text-[11px] text-muted-foreground/70">
                    Maks {pkg.maxDevices} {t("pricing.devices")}
                  </span>
                  {isSelected ? (
                    <Link
                      href={`/payments?pkg=${pkg.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "group/cta relative mt-2 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-xl text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        tier.ctaGlow
                      )}
                    >
                      {/* tinted glass base */}
                      <span className={cn("absolute inset-0", tier.ctaBg)} aria-hidden="true" />
                      {/* specular sheen — a soft top highlight (kept off the text) */}
                      <span className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-white/20 to-transparent" aria-hidden="true" />
                      {/* glass edge highlight */}
                      <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/25" aria-hidden="true" />
                      {/* liquid shine — sweeps once when the card is selected
                          (the button mounts), via a CSS class, not only on hover */}
                      <span className="hs-cta-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden="true" />
                      <span className="relative z-10 inline-flex items-center gap-1.5 [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
                        {t("pricing.buy")}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(pkg.id);
                      }}
                      className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background/30 text-[13px] font-semibold text-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                    >
                      {t("pricing.select")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground/80">
          {t("pricing.reassure")}
        </p>
      </div>

      {/* full-feature popup — everything every user gets (far more than the card) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="gap-0 overflow-hidden rounded-2xl border-border/70 p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-border/60 px-5 py-4 text-left">
            <DialogTitle className="font-display text-base font-bold text-foreground">
              {t("pricing.all_features")} haistudy
            </DialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Semua paket dapat semua fitur inti ini.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_FEATURES.map((g) => (
              <div key={g.group}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                  {g.group}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {g.items.map((it) => (
                    <li
                      key={it}
                      className="flex items-start gap-2 text-[13px] text-foreground/90"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.75} />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
