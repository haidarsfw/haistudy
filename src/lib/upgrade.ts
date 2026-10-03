// ============================================
// Self-serve package upgrade — the one pricing rule
// ============================================
// Pure: imported by the order route, the admin approval and the page alike, so
// the price a buyer sees and the price the server charges cannot drift.

import { PACKAGE_PRICES, type PurchasablePackageId } from "@/lib/payments";

export const TIER_RANK: Record<PurchasablePackageId, number> = {
  share: 0,
  normal: 1,
  vip: 2,
  diamond: 3,
};

export interface UpgradeOption {
  to: PurchasablePackageId;
  /** What the upgrade costs: the difference between the two list prices. */
  price: number;
}

/**
 * Where this access can move up to, and what each step costs.
 *
 * The difference in LIST price, whatever was actually paid the first time: a
 * Normal bought with a class discount still pays Rp5.000 to become VIP. No
 * discounts apply on top (they are for buying a period, and were spent there),
 * and no partner commission, since that is paid once per person.
 *
 * Share to Normal is never offered: the two have the same features (Share is
 * the cheaper price in exchange for sharing a promo), so it would sell nothing.
 */
export function upgradeOptions(from: PurchasablePackageId): UpgradeOption[] {
  return (["vip", "diamond"] as const)
    .filter((to) => TIER_RANK[to] > TIER_RANK[from])
    .map((to) => ({ to, price: PACKAGE_PRICES[to] - PACKAGE_PRICES[from] }));
}

/** The price of one step, or null when it is not an upgrade on offer. */
export function upgradePrice(from: PurchasablePackageId, to: PurchasablePackageId): number | null {
  return upgradeOptions(from).find((o) => o.to === to)?.price ?? null;
}
