"use client";

import { useState } from "react";
import { PACKAGES, getPackage, type PurchasablePackageId } from "@/lib/payments";
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
 * Package step: four cards, nothing else.
 *
 * This has been through a side panel (which shrank the grid from four columns to
 * two and moved every other package when you picked one) and then a panel under
 * the grid (a wall of thirteen feature lines with headings that looked like the
 * lines beneath them, plus a "& masih banyak lagi" link sitting next to an
 * already-clickable "Semua fitur Normal" — two doors to the same room).
 *
 * The step's job is: pick a price. So the cards show price and one line of
 * positioning, the grid never moves, and detail is one click away for whoever
 * wants it. Nothing is duplicated because there is exactly one way in.
 */
export function PackagePicker({ value, onChange }: PackagePickerProps) {
  const { t } = useTranslation();
  const [detailId, setDetailId] = useState<PurchasablePackageId | null>(null);

  const detail = detailId ? getPackage(detailId) : null;
  const accent = detailId ? getAccentClasses(detailId) : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={value === pkg.id}
            onSelect={() => onChange(pkg.id)}
            onShowFeatures={() => setDetailId(pkg.id)}
            layoutId="hs-picker-ring"
          />
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          {detail && accent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {t("payments.features_of")} {t(detail.nameKey)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {/* What this tier ADDS. */}
                <FeatureGroups pkg={detail} checkClass={accent.check} />

                {/* And what everyone gets regardless — so "Semua fitur Normal"
                    resolves right here instead of pointing somewhere else. */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-foreground">
                    {t("payments.features_all_included")}
                  </p>
                  <div className="mt-2.5 space-y-3">
                    {ALL_FEATURES.map((g) => (
                      <div key={g.group}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                          {g.group}
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {g.items.map((item) => (
                            <li key={item} className="text-xs text-foreground/85">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
