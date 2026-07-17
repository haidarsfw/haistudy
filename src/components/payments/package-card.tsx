"use client";

import { Share2, GraduationCap, Crown, Gem, Check, ChevronDown, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  formatIDR,
  MAX_DEVICES_ITEM,
  type PackageDef,
} from "@/lib/payments";
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
 * either washed-out or garish at every value tried, and thin per-tier colour +
 * glow is the most recognisable tell of a generated UI. Restraint is what read
 * as finished.
 *
 * So: one neutral surface, one neutral border, neutral checks and selection.
 * The ONLY colour is the rank logo, inline beside the name with no chip behind
 * it — Share/Normal muted, VIP gold, Diamond sky.
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

/** Exposed so callers (the buy button) can match the card. Neutral for every tier. */
export function getAccentClasses(id: PackageDef["id"]) {
  return {
    check: look(id).check,
    accent: look(id).accent,
    button:
      "bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring/60",
  };
}

/**
 * Grouped feature list — a clean indented list, no surrounding box.
 */
export function FeatureGroups({ pkg, checkClass }: { pkg: PackageDef; checkClass: string }) {
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
  featuresOpen: boolean;
  onFeaturesOpenChange: (open: boolean) => void;
  /** Shared framer layoutId so the selected outline slides between cards. */
  layoutId: string;
  /**
   * How "see all features" behaves:
   * - "accordion" (default): the list expands INSIDE the card.
   * - "button": the toggle only flips state and the parent renders the list
   *   elsewhere. Desktop uses this — the side panel is the detail view, so the
   *   card must not also expand.
   */
  featuresVariant?: "accordion" | "button";
  /**
   * Corner tick when selected. Unused by the picker: it lands on top of the
   * "Paling Populer" pill, and the selection ring already says the same thing.
   */
  showCheck?: boolean;
  /** Footer action (e.g. Buy link). Pinned to the bottom of the card. */
  children?: React.ReactNode;
  className?: string;
}

export function PackageCard({
  pkg,
  selected,
  onSelect,
  featuresOpen,
  onFeaturesOpenChange,
  layoutId,
  featuresVariant = "accordion",
  showCheck,
  children,
  className,
}: PackageCardProps) {
  const { t } = useTranslation();
  const Icon = ICONS[pkg.icon] ?? GraduationCap;
  const tier = look(pkg.id);

  const toggleFeatures = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFeaturesOpenChange(!featuresOpen);
  };
  const toggleLabel = featuresOpen ? t("pricing.show_less") : t("pricing.see_all");

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
        "relative flex h-full cursor-pointer flex-col rounded-2xl border p-4 shadow-xl shadow-black/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        "border-white/[0.14]",
        selected
          ? "shadow-2xl ring-2 ring-white/30"
          : "hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl",
        className
      )}
    >
      {/* Selection outline that slides between cards */}
      {selected && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-white/30"
          aria-hidden="true"
        />
      )}

      {/* Corner tick. Neutral, like everything else — the old one was a tinted
          per-tier chip. */}
      {showCheck && selected && (
        <span className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      {/* ─── DESKTOP (≥sm) ─── */}
      <div className="relative z-10 hidden w-full flex-col sm:flex">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4 shrink-0", tier.accent)} strokeWidth={2.25} />
          <h3 className="font-display text-base font-bold text-foreground">{t(pkg.nameKey)}</h3>
          {pkg.highlight && (
            <span className="ml-auto shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
              {t("pricing.popular")}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-end gap-1">
          <span className="font-display text-2xl font-bold leading-none tracking-tight text-foreground">
            {formatIDR(pkg.price)}
          </span>
          <span className="pb-0.5 text-[11px] text-muted-foreground">
            / {t("pricing.per_duration")}
          </span>
        </div>

        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{t(pkg.shortKey)}</p>

        <button
          type="button"
          onClick={toggleFeatures}
          aria-expanded={featuresOpen}
          className="mt-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {toggleLabel}
          <ChevronDown className={cn("h-3 w-3 transition-transform", featuresOpen && "rotate-180")} />
        </button>
      </div>

      {/* ─── MOBILE (<sm): compact row ─── */}
      <div className="relative z-10 flex w-full items-center gap-2.5 text-left sm:hidden">
        <Icon className={cn("h-4 w-4 shrink-0", tier.accent)} strokeWidth={2.25} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-display text-sm font-bold">{t(pkg.nameKey)}</span>
              {pkg.highlight && (
                <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-semibold text-background">
                  {t("pricing.popular")}
                </span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap font-display text-base font-bold text-foreground">
              {formatIDR(pkg.price)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t(pkg.shortKey)}</p>
        </div>
        <button
          type="button"
          onClick={toggleFeatures}
          aria-expanded={featuresOpen}
          aria-label={toggleLabel}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", featuresOpen && "rotate-180")} />
        </button>
      </div>

      {/* ─── Feature expansion (skipped when the parent owns the detail view) ─── */}
      {featuresVariant !== "button" && (
      <AnimatePresence initial={false}>
        {featuresOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 overflow-hidden"
          >
            <div className="mt-3 border-t border-border/60 pt-3">
              <FeatureGroups pkg={pkg} checkClass={tier.check} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {children && <div className="relative z-10 mt-auto w-full pt-4">{children}</div>}
    </motion.div>
  );
}
