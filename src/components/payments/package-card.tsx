"use client";

import { useEffect, useState } from "react";
import { Share2, GraduationCap, Crown, Gem, Check, ChevronDown, Sparkles, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  packageAccent,
  formatIDR,
  type PackageAccent,
  type PackageDef,
} from "@/lib/payments";
import { useTranslation } from "@/components/providers/language-provider";
import { useIsMobile } from "@/hooks/use-is-mobile";
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

// ─── "Lihat semua fitur" — popover (desktop) / accordion (mobile) ───
function FeaturesDisclosure({
  pkg,
  open,
  onOpenChange,
  checkClass,
}: {
  pkg: PackageDef;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkClass: string;
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  // Defer the popover-vs-accordion split until after mount so the server HTML
  // and the first client paint match (PricingSection is server-rendered).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mobile = mounted && isMobile;

  const groups = (
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

  // Mobile: inline accordion that expands down under the card.
  if (mobile) {
    return (
      <div className="mt-2 w-full">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(!open);
          }}
          aria-expanded={open}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {t("pricing.see_all")}
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3">{groups}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: popover anchored beside the card (base-ui auto-flips on collision).
  return (
    <div className="mt-2 w-full">
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline data-[popup-open]:text-foreground"
        >
          {t("pricing.see_all")}
          <ChevronDown
            className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          />
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={10}
          onClick={(e) => e.stopPropagation()}
          className="w-64"
        >
          {groups}
        </PopoverContent>
      </Popover>
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
  showCheck,
  children,
  className,
}: PackageCardProps) {
  const { t } = useTranslation();
  const Icon = ICONS[pkg.icon] ?? GraduationCap;
  const accent = ACCENTS[packageAccent(pkg.id)];

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
        "relative flex h-full cursor-pointer flex-col items-center rounded-2xl border p-4 text-center transition-colors",
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

      {/* Icon + tier badge */}
      <div className="relative z-10 flex flex-col items-center gap-2">
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

      {/* Name + price */}
      <h3 className="relative z-10 mt-2 font-heading text-lg font-bold">{t(pkg.nameKey)}</h3>
      <div className="relative z-10 mt-0.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-foreground sm:text-[1.65rem]">
          {formatIDR(pkg.price)}
        </span>
        <span className="text-xs text-muted-foreground">/ {t("pricing.per_duration")}</span>
      </div>

      {/* Punchy short highlight (NOT the full list) */}
      <p className="relative z-10 mt-2 text-xs leading-relaxed text-muted-foreground">
        {t(pkg.shortKey)}
      </p>

      {/* Lihat semua fitur → popover (desktop) / accordion (mobile) */}
      <div className="relative z-10">
        <FeaturesDisclosure
          pkg={pkg}
          open={featuresOpen}
          onOpenChange={onFeaturesOpenChange}
          checkClass={accent.check}
        />
      </div>

      {/* Footer action (Buy link, etc.) */}
      {children && <div className="relative z-10 mt-auto w-full pt-4">{children}</div>}
    </motion.div>
  );
}
