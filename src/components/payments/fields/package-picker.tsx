"use client";

import { Fragment, useState } from "react";
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
  // Which package's feature list is open. null = none open.
  const [detailPkgId, setDetailPkgId] = useState<PurchasablePackageId | null>(null);

  const detailPkg = detailPkgId ? getPackage(detailPkgId) : null;
  const detailAccent = detailPkgId ? getAccentClasses(detailPkgId) : null;

  const handleSelect = (id: PurchasablePackageId) => {
    onChange(id);
    // If a panel is already open, follow the newly-selected package.
    setDetailPkgId((cur) => (cur ? id : cur));
  };

  return (
    <>
      {/* ── MOBILE / TABLET (<lg): single column + inline accordion under the tapped card ── */}
      <div className="grid grid-cols-1 gap-2.5 lg:hidden">
        {PACKAGES.map((pkg) => {
          const accent = getAccentClasses(pkg.id);
          const open = detailPkgId === pkg.id;
          return (
            <Fragment key={pkg.id}>
              <PackageCard
                pkg={pkg}
                selected={value === pkg.id}
                onSelect={() => handleSelect(pkg.id)}
                featuresOpen={open}
                onFeaturesOpenChange={(o) => setDetailPkgId(o ? pkg.id : null)}
                featuresVariant="button"
                layoutId="hs-picker-ring-m"
                showCheck
                className="p-3.5"
              />
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    {/* Feature list ONLY — name/price/desc are on the card directly
                        above, so we don't repeat them (Item 1). */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <FeatureGroups pkg={pkg} checkClass={accent.check} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Fragment>
          );
        })}
      </div>

      {/* ── DESKTOP (≥lg): master-detail side panel (unchanged from current behaviour) ── */}
      <div
        className={cn(
          "hidden gap-3 lg:grid",
          detailPkg ? "lg:grid-cols-[1fr_minmax(0,19rem)]" : "lg:grid-cols-1"
        )}
      >
        <div
          className={cn(
            "grid items-stretch gap-2.5",
            detailPkg ? "lg:grid-cols-2" : "lg:grid-cols-4"
          )}
        >
          {PACKAGES.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              selected={value === pkg.id}
              onSelect={() => handleSelect(pkg.id)}
              featuresOpen={detailPkgId === pkg.id}
              onFeaturesOpenChange={(o) => setDetailPkgId(o ? pkg.id : null)}
              featuresVariant="button"
              layoutId="hs-picker-ring-d"
              showCheck
              className="p-3.5"
            />
          ))}
        </div>

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
    </>
  );
}
