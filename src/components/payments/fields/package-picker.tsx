"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  PACKAGES,
  getPackage,
  formatIDR,
  type PurchasablePackageId,
} from "@/lib/payments";
import {
  PackageCard,
  FeatureGroups,
  getAccentClasses,
} from "@/components/payments/package-card";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

interface PackagePickerProps {
  value: PurchasablePackageId;
  onChange: (id: PurchasablePackageId) => void;
}

export function PackagePicker({ value, onChange }: PackagePickerProps) {
  const { t } = useTranslation();
  // Which package's full feature list is shown in the side/below detail panel.
  // null = panel hidden.
  const [detailPkgId, setDetailPkgId] = useState<PurchasablePackageId | null>(null);

  const detailPkg = detailPkgId ? getPackage(detailPkgId) : null;
  const detailAccent = detailPkgId ? getAccentClasses(detailPkgId) : null;

  const handleSelect = (id: PurchasablePackageId) => {
    onChange(id);
    // If the detail panel is already open, swap it to the newly-selected package.
    setDetailPkgId((cur) => (cur ? id : cur));
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3",
        detailPkg && "lg:grid-cols-[1fr_minmax(0,19rem)]"
      )}
    >
      {/* Left: package cards — 4-up when the detail panel is closed (desktop),
          2-up when it's open (the panel takes the right column). */}
      <div
        className={cn(
          "grid items-stretch gap-2.5",
          detailPkg
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={value === pkg.id}
            onSelect={() => handleSelect(pkg.id)}
            featuresOpen={detailPkgId === pkg.id}
            onFeaturesOpenChange={(open) => setDetailPkgId(open ? pkg.id : null)}
            featuresVariant="button"
            layoutId="hs-picker-ring"
            showCheck
            className="p-3.5"
          />
        ))}
      </div>

      {/* Right (desktop ≥lg) / below (mobile): master-detail feature panel.
          Keyed by package id so swapping packages crossfades the content. */}
      <AnimatePresence initial={false} mode="wait">
        {detailPkg && detailAccent && (
          <motion.aside
            key={detailPkg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="lg:sticky lg:top-4 lg:self-start"
          >
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-heading text-base font-bold">{t(detailPkg.nameKey)}</h4>
                  <div className="mt-0.5 flex items-baseline gap-1">
                    <span className="text-lg font-bold">{formatIDR(detailPkg.price)}</span>
                    <span className="text-xs text-muted-foreground">
                      / {t("pricing.per_duration")}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailPkgId(null)}
                  aria-label={t("common.close")}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t(detailPkg.shortKey)}</p>
              <div className="mt-3 border-t border-border/60 pt-3">
                <FeatureGroups pkg={detailPkg} checkClass={detailAccent.check} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
