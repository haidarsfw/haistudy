// ============================================
// Tier helpers - VIP feature gating
// ============================================
// Single source of truth for "can this user use VIP features".
// Admins always pass. Tier "vip" and "diamond" are the paid tiers.

import type { Session } from "@/types";

export type PackageTier = "share" | "normal" | "vip" | "diamond";

/** True for the paid tiers (vip, diamond). Does NOT consider admin. */
export function isVipTier(tier: PackageTier | null | undefined): boolean {
  return tier === "vip" || tier === "diamond";
}

/**
 * Whether a session may use VIP-only features (custom accent/fonts, vip-lounge,
 * DM, highlight colors beyond yellow, snippet library, voice lounge).
 * Admins always qualify regardless of tier.
 */
export function canUseVipFeatures(
  session: { isAdmin?: boolean; packageTier?: PackageTier | null } | null | undefined
): boolean {
  if (!session) return false;
  if (session.isAdmin) return true;
  return isVipTier(session.packageTier);
}

/** Server-side variant: explicit isAdmin + tier args. */
export function canUseVip(isAdmin: boolean, tier: PackageTier | null | undefined): boolean {
  return isAdmin || isVipTier(tier);
}

export type { Session };
