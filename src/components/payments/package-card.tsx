"use client";

import { Share2, GraduationCap, Crown, Gem, Check, ArrowRight, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { formatIDR, MAX_DEVICES_ITEM, type PackageDef } from "@/lib/payments";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Share2, GraduationCap, Crown, Gem };

/**
 * Per-tier look — deliberately the SAME treatment the landing pricing settled on
 * (see the TIER map in landing/pricing-section.tsx).
 *
 * These cards used to carry gold/sky wash surfaces, coloured glow halos, icon
 * chips with tinted backgrounds and an orange "Paling Populer" pill. That is the
 * look the landing spent five rounds removing: tinted surfaces on dark read
 * either washed-out or garish at every value tried, and thin per-tier colour plus
 * glow is the most recognisable tell of a generated UI. Restraint read as
 * finished.
 *
 * So: one neutral surface, one neutral border, neutral checks and selection. The
 * ONLY colour is the rank logo, inline beside the name with no chip behind it.
 */
const NEUTRAL = "#131a16";

interface TierLook {
  check: string;
  /** Rank-logo colour — the one differentiator between tiers. */
  accent: string;
}

const TIER: Record<string, TierLook> = {
  share: { check: "text-foreground/70", accent: "text-foreground/55" },
  normal: { check: "text-foreground/70", accent: "text-foreground/55" },
  vip: { check: "text-foreground/70", accent: "text-amber-400" },
  diamond: { check: "text-foreground/70", accent: "text-sky-400" },
};

const look = (id: string): TierLook => TIER[id] ?? TIER.normal;

/** Exposed so callers can match the card. Neutral for every tier. */
export function getAccentClasses(id: PackageDef["id"]) {
  return {
    check: look(id).check,
    accent: look(id).accent,
    button:
      "bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring/60",
  };
}

export function FeatureGroups({
  pkg,
  checkClass,
}: {
  pkg: PackageDef;
  checkClass: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2.5 text-left">
      {pkg.featureGroups.map((g) => (
        <div key={g.labelKey}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t(g.labelKey)}
          </p>
          <ul className="mt-1 space-y-1">
            {g.itemKeys.map((k) => (
              <li key={k} className="flex items-start gap-1.5 text-xs text-foreground/90">
                <Check className={cn("mt-0.5 h-3 w-3 shrink-0", checkClass)} strokeWidth={3} />
                <span>
                  {k === MAX_DEVICES_ITEM
                    ? `${t("pricing.max_device_prefix")} ${pkg.maxDevices} ${t("pricing.devices")}`
                    : t(k)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface PackageCardProps {
  pkg: PackageDef;
  selected: boolean;
  onSelect: () => void;
  /** Shared framer layoutId so the selection outline slides between cards. */
  layoutId: string;
  /** Opens this package's feature dialog. Stops propagation — it isn't a pick. */
  onShowFeatures?: () => void;
  className?: string;
}

/**
 * A price card. Nothing here expands and no card ever resizes: the body is
 * price + one line of positioning, and detail opens in a dialog. Cards that
 * grow when you touch them move every other card, which is the opposite of what
 * a compare-four-prices step needs.
 */
export function PackageCard({
  pkg,
  selected,
  onSelect,
  layoutId,
  onShowFeatures,
  className,
}: PackageCardProps) {
  const { t } = useTranslation();
  const Icon = ICONS[pkg.icon] ?? GraduationCap;
  const tier = look(pkg.id);

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      // Inline so twMerge can't drop it against a bg-* utility.
      style={{ backgroundColor: NEUTRAL }}
      className={cn(
        "relative flex h-full cursor-pointer flex-col rounded-2xl border p-4 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "border-white/[0.14]",
        !selected && "hover:border-white/25",
        className
      )}
    >
      {/* The selection outline is the only thing that moves. The cards never
          lift or resize, so the grid stays still while you compare. */}
      {selected && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/45"
          aria-hidden="true"
        />
      )}

      <div className="relative z-10 flex items-center gap-1.5">
        <Icon className={cn("h-4 w-4 shrink-0", tier.accent)} strokeWidth={2.25} />
        <h3 className="font-display text-base font-bold text-foreground">{t(pkg.nameKey)}</h3>
        {pkg.highlight && (
          <span className="ml-auto shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
            {t("pricing.popular")}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-2.5 flex items-end gap-1">
        <span className="font-display text-2xl font-bold leading-none tracking-tight text-foreground">
          {formatIDR(pkg.price)}
        </span>
        <span className="pb-0.5 text-[11px] text-muted-foreground">
          / {t("pricing.per_duration")}
        </span>
      </div>

      <p className="relative z-10 mt-2.5 text-xs leading-relaxed text-muted-foreground">
        {t(pkg.shortKey)}
      </p>

      {onShowFeatures && (
        <button
          type="button"
          // Reading the features is not choosing the package.
          onClick={(e) => {
            e.stopPropagation();
            onShowFeatures();
          }}
          className="relative z-10 mt-auto inline-flex w-fit items-center gap-1 pt-3 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {t("pricing.see_all")}
          <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
