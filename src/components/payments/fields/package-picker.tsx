"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PACKAGES,
  getPackage,
  type PurchasablePackageId,
} from "@/lib/payments";
import {
  PackageCard,
  FeatureGroups,
  getAccentClasses,
} from "@/components/payments/package-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALL_FEATURES } from "@/data/landing/all-features";
import { useTranslation } from "@/components/providers/language-provider";

interface PackagePickerProps {
  value: PurchasablePackageId;
  onChange: (id: PurchasablePackageId) => void;
}

/**
 * Package step.
 *
 * The cards never resize and never reflow. The previous cut was a master-detail:
 * opening a package's features shrank the grid from 4 columns to 2 and slid a
 * side panel in, so choosing a package moved every other package on screen and
 * only one could be read at a time. Comparing is the entire job of this step,
 * and that layout fought it.
 *
 * Now: a fixed 4-up grid, and the SELECTED package's features render in one
 * panel underneath. Selecting is the only interaction — there is no separate
 * open/close state to get stranded in, and the panel always shows what you
 * actually picked.
 */
export function PackagePicker({ value, onChange }: PackagePickerProps) {
  const { t } = useTranslation();
  const [allOpen, setAllOpen] = useState(false);

  const selected = getPackage(value);
  const accent = getAccentClasses(value);

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={value === pkg.id}
            onSelect={() => onChange(pkg.id)}
            layoutId="hs-picker-ring"
          />
        ))}
      </div>

      {selected && (
        <div className="mt-3 rounded-2xl border border-border bg-card p-4">
          {/* Keyed on the id so switching package cross-fades the list rather
              than animating its height — height animation is what made this
              step feel like it was lurching. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("payments.features_of")} {t(selected.nameKey)}
                </p>
                <button
                  type="button"
                  onClick={() => setAllOpen(true)}
                  className="shrink-0 text-[11px] font-semibold text-foreground/70 underline-offset-2 transition-colors hover:text-foreground hover:underline"
                >
                  {t("pricing.more_all")}
                </button>
              </div>
              <FeatureGroups
                pkg={selected}
                checkClass={accent.check}
                onInheritedClick={() => setAllOpen(true)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* "Semua fitur Normal" / "Semua fitur VIP" are references, not answers.
          This is what they point at. */}
      <Dialog open={allOpen} onOpenChange={setAllOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{t("pricing.more_all")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {ALL_FEATURES.map((g) => (
              <div key={g.group}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {g.items.map((item) => (
                    <li key={item} className="text-sm text-foreground/90">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("pricing.more_note")}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
