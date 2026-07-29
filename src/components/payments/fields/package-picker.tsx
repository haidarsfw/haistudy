"use client";

import { PACKAGES, type PurchasablePackageId } from "@/lib/payments";
import { PackageCard } from "@/components/payments/package-card";

interface PackagePickerProps {
  value: PurchasablePackageId;
  onChange: (id: PurchasablePackageId) => void;
}

/**
 * Package step: four cards, each carrying its own short list.
 *
 * This has been a side panel (which shrank the grid four columns to two and
 * moved every other package when you picked one), a panel under the grid (a
 * thirteen-line wall), and a dialog per card (which put the comparison behind a
 * click, on the one step whose entire job is comparing).
 *
 * Everything is on the page now. No panel, no dialog, no expanding: the lists
 * are short enough to sit on the cards, so all four are readable at once and
 * nothing moves when you choose.
 */
export function PackagePicker({ value, onChange }: PackagePickerProps) {
  return (
    // Two across on a phone, not one. Stacked, four cards ran to roughly three
    // screens of scrolling on the one step whose whole job is comparing them —
    // you cannot compare what you cannot see at the same time.
    //
    // `auto-rows-fr` is what stops the heights wobbling: `h-full` only equalises
    // cards WITHIN a row, so at two columns the second row sized itself
    // independently and the grid stepped.
    <div className="grid auto-rows-fr grid-cols-2 gap-2.5 lg:grid-cols-4">
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
  );
}
