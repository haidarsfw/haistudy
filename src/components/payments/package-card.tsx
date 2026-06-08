"use client";

import { Share2, GraduationCap, Crown, Gem, Check, ChevronDown, Sparkles, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  packageAccent,
  formatIDR,
  type PackageAccent,
  type PackageDef,
} from "@/lib/payments";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = { Share2, GraduationCap, Crown, Gem };

// ─── Accent theme tokens (gold = VIP role-amber, diamond = sky, else primary) ───
interface AccentClasses {
  selected: string; // border + bg + ring for the selected card
  glow: string; // ambient shadow when selected
  iconBg: string; // icon chip bg+fg when selected
  iconIdle: string; // icon color when idle
  badgeOn: string; // small pill bg+fg when selected
  check: string; // feature-list check color
  button: string; // primary action button
  ring: string; // animated outline color (border-only)
}

const ACCENTS: Record<PackageAccent, AccentClasses> = {
  primary: {
    selected: "border-primary bg-primary/5 ring-1 ring-primary/25",
    glow: "shadow-lg shadow-primary/10",
    iconBg: "bg-primary/15 text-primary",
    iconIdle: "text-muted-foreground",
    badgeOn: "bg-primary text-primary-foreground",
    check: "text-primary",
    button: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20",
    ring: "border-primary",
  },
  gold: {
    selected: "border-amber-400/70 bg-amber-500/5 ring-1 ring-amber-400/40",
    glow: "shadow-lg shadow-amber-500/15",
    iconBg: "bg-amber-500/15 text-amber-500 dark:text-amber-300",
    iconIdle: "text-muted-foreground",
    badgeOn: "bg-amber-500 text-white",
    check: "text-amber-500 dark:text-amber-300",
    button: "bg-amber-500 text-white hover:bg-amber-500/90 hover:shadow-amber-500/25",
    ring: "border-amber-400/70",
  },
  diamond: {
    selected:
      "border-sky-400/70 bg-sky-500/5 ring-1 ring-sky-400/40 shadow-[0_0_30px_-8px_rgba(56,189,248,0.55)]",
    glow: "shadow-lg shadow-sky-500/20",
    iconBg: "bg-sky-500/15 text-sky-500 dark:text-sky-300",
    iconIdle: "text-muted-foreground",
    badgeOn: "bg-sky-500 text-white",
    check: "text-sky-500 dark:text-sky-300",
    button: "bg-sky-500 text-white hover:bg-sky-500/90 hover:shadow-sky-500/25",
    ring: "border-sky-400/80",
  },
};

/** Exposed so callers (landing buy button) can match the package accent. */
export function getAccentClasses(id: PackageDef["id"]): AccentClasses {
  return ACCENTS[packageAccent(id)];
}

/**
 * Grouped feature list — a clean indented list with no surrounding box.
 * Rendered inline (downward accordion) inside the card on both desktop & mobile.
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
                <span>{t(k)}</span>
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
   * - "accordion" (default): expands the grouped feature list downward INSIDE the
   *   card, full-width below both the desktop column and mobile-row headers.
   * - "button": the toggle only flips state; the parent renders the feature list
   *   elsewhere (no inline expansion). Legacy escape hatch — unused in-tree.
   */
  featuresVariant?: "accordion" | "button";
  /** Render a check badge in the corner when selected (form picker). */
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
  const accent = ACCENTS[packageAccent(pkg.id)];

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
      className={cn(
        "relative flex h-full cursor-pointer flex-col rounded-2xl border p-4 transition-colors",
        selected
          ? cn(accent.selected, accent.glow)
          : "border-border bg-card hover:border-primary/25 hover:bg-muted/30",
        className
      )}
    >
      {/* Animated outline that slides between cards on selection change */}
      {selected && (
        <motion.span
          layoutId={layoutId}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "pointer-events-none absolute inset-0 rounded-2xl border-2",
            accent.ring
          )}
          aria-hidden="true"
        />
      )}

      {/* Top-right status pill: Populer (normal). Diamond stays understated. */}
      {pkg.highlight && (
        <span
          className={cn(
            "absolute -top-2.5 right-4 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-semibold shadow-sm",
            selected ? accent.badgeOn : "bg-primary text-primary-foreground"
          )}
        >
          {t(pkg.badgeKey)}
        </span>
      )}

      {/* VIP-only "Best Price to Value" gold pill */}
      {pkg.bestValue && (
        <span className="absolute -top-2.5 left-4 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-semibold text-white shadow-sm">
          <Sparkles className="h-2.5 w-2.5" />
          {t("pricing.best_value")}
        </span>
      )}

      {/* Corner check (form picker) */}
      {showCheck && selected && (
        <span
          className={cn(
            "absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full",
            accent.badgeOn
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}

      {/* ─── DESKTOP (≥sm): centered column (Claude-style) ─── */}
      <div className="relative z-10 hidden w-full flex-col items-center text-center sm:flex">
        {/* Icon chip + tier badge */}
        <div className="flex flex-col items-center gap-2">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              selected ? accent.iconBg : cn("bg-muted", accent.iconIdle)
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
              selected ? accent.badgeOn : "bg-muted text-muted-foreground"
            )}
          >
            {t(pkg.badgeKey)}
          </span>
        </div>

        {/* Name */}
        <h3 className="mt-2 font-heading text-lg font-bold">{t(pkg.nameKey)}</h3>

        {/* Price — amount on ONE line (nowrap), "/30 hari" centered beneath */}
        <div className="mt-1 flex flex-col items-center">
          <span className="whitespace-nowrap text-3xl font-bold leading-none text-foreground">
            {formatIDR(pkg.price)}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">/ {t("pricing.per_duration")}</span>
        </div>

        {/* Punchy short highlight (NOT the full list) */}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(pkg.shortKey)}</p>

        {/* Inline feature toggle */}
        <button
          type="button"
          onClick={toggleFeatures}
          aria-expanded={featuresOpen}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {toggleLabel}
          <ChevronDown className={cn("h-3 w-3 transition-transform", featuresOpen && "rotate-180")} />
        </button>
      </div>

      {/* ─── MOBILE (<sm): compact row — [icon] [name+badge … price] [chevron] ─── */}
      <div className="relative z-10 flex w-full items-center gap-3 text-left sm:hidden">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
            selected ? accent.iconBg : cn("bg-muted", accent.iconIdle)
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-heading text-sm font-bold">{t(pkg.nameKey)}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                  selected ? accent.badgeOn : "bg-muted text-muted-foreground"
                )}
              >
                {t(pkg.badgeKey)}
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-base font-bold text-foreground">
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

      {/* ─── SHARED inline feature expansion (full-width, both layouts) ─── */}
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
              {/* Subtle divider instead of a bordered card — "no box" per feedback. */}
              <div className="mt-3 border-t border-border/60 pt-3">
                <FeatureGroups pkg={pkg} checkClass={accent.check} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Footer action (Buy link, etc.) — pinned to the bottom. */}
      {children && <div className="relative z-10 mt-auto w-full pt-4">{children}</div>}
    </motion.div>
  );
}
