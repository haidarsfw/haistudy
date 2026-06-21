// ============================================
// Exam quota — credit model (shared by start + quota + admin routes)
// ============================================
// Quota is consumable and decoupled from raw attempt history so it can be reset
// + topped-up without deleting attempts:
//   remaining = tierBase + bonus − used
//   used      = count(non-abandoned attempts started at/after countFrom)
//   countFrom = max(EXAM_QUOTA_EPOCH, override.reset_at)
// Per (license_key, scope_key, subject_id). Admin -1 = unlimited.

import type { PackageTier } from "@/lib/tier";

/**
 * Global one-time reset. Attempts started BEFORE this instant don't consume
 * quota, so everyone starts fresh under the new tier limits shipped in Round-3.
 * Set to the Batch B deploy date. Bump only for a deliberate global re-reset.
 */
export const EXAM_QUOTA_EPOCH = "2026-06-21T00:00:00.000Z";

/** Tier base allowance. Admin → -1 (unlimited). share/normal 3, vip 5, diamond 10. */
export function tierBase(
  isAdmin: boolean,
  tier: PackageTier | null | undefined
): number {
  if (isAdmin) return -1; // -1 = unlimited (shown as ∞ on the frontend)
  switch (tier) {
    case "diamond":
      return 10;
    case "vip":
      return 5;
    default:
      return 3; // share, normal
  }
}

/** Effective "count attempts from" instant = later of the global epoch and reset_at. */
export function quotaCountFrom(resetAt: string | null | undefined): string {
  if (!resetAt) return EXAM_QUOTA_EPOCH;
  return new Date(resetAt).getTime() > new Date(EXAM_QUOTA_EPOCH).getTime()
    ? resetAt
    : EXAM_QUOTA_EPOCH;
}

export interface QuotaInfo {
  used: number;
  /** base + bonus, or -1 when unlimited. */
  max: number;
  /** -1 when unlimited. */
  remaining: number;
  bonus: number;
  base: number;
}

/** Combine tier base + bonus credits + used count into the quota summary. */
export function computeQuota(args: {
  isAdmin: boolean;
  tier: PackageTier | null | undefined;
  bonus: number;
  used: number;
}): QuotaInfo {
  const base = tierBase(args.isAdmin, args.tier);
  const bonus = Math.max(0, args.bonus | 0);
  if (base === -1) {
    return { used: args.used, max: -1, remaining: -1, bonus, base };
  }
  const max = base + bonus;
  return { used: args.used, max, remaining: Math.max(0, max - args.used), bonus, base };
}

// ─── IAP top-up packs (in-app purchase for more attempts) ───
export interface QuotaPack {
  qty: number;
  /** Flat price in IDR (no unique-amount suffix for top-ups). */
  price: number;
}

export const QUOTA_PACKS: QuotaPack[] = [
  { qty: 1, price: 2000 },
  { qty: 3, price: 5000 },
  { qty: 7, price: 10000 },
];

/** Validate a requested top-up quantity → the matching pack (or null). */
export function quotaPackFor(qty: number): QuotaPack | null {
  return QUOTA_PACKS.find((p) => p.qty === qty) ?? null;
}
