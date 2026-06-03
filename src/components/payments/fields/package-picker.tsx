"use client";

import { useState } from "react";
import { PACKAGES, type PurchasablePackageId } from "@/lib/payments";
import { PackageCard } from "@/components/payments/package-card";

interface PackagePickerProps {
  value: PurchasablePackageId;
  onChange: (id: PurchasablePackageId) => void;
}

export function PackagePicker({ value, onChange }: PackagePickerProps) {
  const [openFeatures, setOpenFeatures] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2">
      {PACKAGES.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          selected={value === pkg.id}
          onSelect={() => onChange(pkg.id)}
          featuresOpen={openFeatures === pkg.id}
          onFeaturesOpenChange={(open) => setOpenFeatures(open ? pkg.id : null)}
          layoutId="hs-picker-ring"
          showCheck
          className="p-3.5"
        />
      ))}
    </div>
  );
}
