"use client";

import {
  Share2,
  GraduationCap,
  Crown,
  Gem,
  Check,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatIDR, MAX_DEVICES_ITEM, type PackageDef } from "@/lib/payments";
import {
  PACKAGE_HIGHLIGHTS,
  CAVEAT_KEYS,
} from "@/data/landing/package-highlights";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Share2, GraduationCap, Crown, Gem };

/**
 * Per-tier look — the SAME treatment the landing pricing settled on (see the
 * TIER map in landing/pricing-section.tsx).
 *
 * These cards used to carry gold/sky wash surfaces, coloured glow halos, icon
 * chips with tinted backgrounds and an orange "Paling Populer" pill. That is the
 * look the landing spent five rounds removing: tinted surfaces on dark read
 * either washed-out or garish at every value tried, and thin per-tier colour
 * plus glow is the most recognisable tell of a generated UI.
 *
 * One neutral surface, one neutral border. The ONLY colour is the rank logo.
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

interface PackageCardProps {
  pkg: PackageDef;
  selected: boolean;
  onSelect: () => void;
  /** Shared framer layoutId so the selection outline slides between cards. */
  layoutId: string;
  className?: string;
}

/**
 * A price card, features included.
 *
 * Nothing expands and no card resizes: every card prints its short list up
 * front, so all four are comparable at a glance and the grid never moves. The
 * detail used to live behind a click (a dialog, then a side panel) — which hid
 * the one comparison this step exists to make.
 */
export function PackageCard({
  pkg,
  selected,
  onSelect,
  layoutId,
  className,
}: PackageCardProps) {
  const { t } = useTranslation();
  const Icon = ICONS[pkg.icon] ?? GraduationCap;
  const tier = look(pkg.id);
  const highlights = PACKAGE_HIGHLIGHTS[pkg.id] ?? [];

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
      {/* The outline is the only thing that moves. Cards never lift or resize,
          so the grid stays still while you compare. */}
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

      <ul className="relative z-10 mt-3.5 space-y-1.5 border-t border-white/[0.08] pt-3.5">
        {highlights.map((k) => {
          const caveat = CAVEAT_KEYS.has(k);
          return (
            <li
              key={k}
              className={cn(
                "flex items-start gap-1.5 text-[11px] leading-snug",
                caveat ? "text-amber-400/80" : "text-foreground/85"
              )}
            >
              {/* A condition is not a feature, so it doesn't get a tick. */}
              {caveat ? (
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={2.5} />
              ) : (
                <Check className={cn("mt-0.5 h-3 w-3 shrink-0", tier.check)} strokeWidth={3} />
              )}
              <span>
                {k === MAX_DEVICES_ITEM
                  ? `${t("pricing.max_device_prefix")} ${pkg.maxDevices} ${t("pricing.devices")}`
                  : t(k)}
              </span>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
