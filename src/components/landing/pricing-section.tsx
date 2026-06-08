"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PACKAGES } from "@/lib/payments";
import { useTranslation } from "@/components/providers/language-provider";
import { PackageCard, getAccentClasses } from "@/components/payments/package-card";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [selectedPkg, setSelectedPkg] = useState("normal");
  // Multiple cards may be expanded at once so users can compare feature lists
  // side by side — opening one no longer collapses the others.
  const [openFeatures, setOpenFeatures] = useState<Set<string>>(new Set());
  const { t } = useTranslation();

  return (
    <section className="relative px-4 py-20 sm:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-primary/15 opacity-60" />
        <div className="absolute top-20 right-1/4 h-60 w-60 rounded-full bg-primary/10 opacity-50" />
      </div>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t("pricing.title")}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-[15px] text-muted-foreground">
          {t("pricing.subtitle")}
        </p>

        {/* items-stretch keeps cards equal-height when collapsed; once any card's
            features accordion is open, switch to items-start so only that card grows. */}
        <div
          className={cn(
            "mt-10 grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4",
            openFeatures.size > 0 ? "items-start" : "items-stretch"
          )}
        >
          {PACKAGES.map((pkg) => {
            const isSelected = selectedPkg === pkg.id;
            const accent = getAccentClasses(pkg.id);
            return (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={isSelected}
                onSelect={() => setSelectedPkg(pkg.id)}
                featuresOpen={openFeatures.has(pkg.id)}
                onFeaturesOpenChange={(open) =>
                  setOpenFeatures((prev) => {
                    const next = new Set(prev);
                    if (open) next.add(pkg.id);
                    else next.delete(pkg.id);
                    return next;
                  })
                }
                layoutId="hs-pricing-ring"
              >
                {isSelected ? (
                  <Link
                    href={`/payments?pkg=${pkg.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all hover:shadow-lg",
                      accent.button
                    )}
                  >
                    {t("pricing.buy")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPkg(pkg.id);
                    }}
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg border-0 bg-transparent text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {t("pricing.select")}
                  </button>
                )}
              </PackageCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
