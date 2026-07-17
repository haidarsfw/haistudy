import type { PurchasablePackageId } from "@/lib/payments";
import { MAX_DEVICES_ITEM } from "@/lib/payments";

/**
 * The short per-package list printed ON the card at checkout.
 *
 * Deliberately NOT the full feature list, and not the landing's list either.
 * The landing is selling — it lists everything a buyer gets. By the time
 * someone is on /payments they have already decided to buy; the only question
 * left is WHICH package, so the card answers exactly that: what this tier adds
 * over the one before it, and how many devices.
 *
 * The full list lived here once as a thirteen-line panel and read as a wall,
 * and before that as a dialog, which hid the comparison behind a click. Four
 * short lists side by side is the comparison.
 *
 * `MAX_DEVICES_ITEM` resolves to the package's real `maxDevices` at render, so
 * the count can't drift from payments.ts.
 */
export const PACKAGE_HIGHLIGHTS: Record<PurchasablePackageId, string[]> = {
  // Share is Normal with a condition attached, so it says so rather than
  // repeating Normal's lines.
  share: [
    "pricing.feat_all_normal",
    MAX_DEVICES_ITEM,
    "pricing.note_share",
  ],
  normal: [
    "pricing.gnorm_content",
    "pricing.gnorm_practice",
    "pricing.feat_ai",
    "pricing.gnorm_community",
    MAX_DEVICES_ITEM,
  ],
  vip: [
    "pricing.feat_all_normal",
    "pricing.gvip_ai",
    "pricing.gvip_perks",
    "pricing.gvip_custom",
    MAX_DEVICES_ITEM,
  ],
  diamond: [
    "pricing.feat_all_vip",
    "pricing.feat_name_glow",
    "pricing.feat_diamond_badge",
    MAX_DEVICES_ITEM,
  ],
};

/**
 * Lines that qualify rather than add — rendered muted with a warning mark, not
 * a tick, because "wajib share ke teman" is a cost and ticking it would read as
 * a feature.
 */
export const CAVEAT_KEYS = new Set(["pricing.note_share"]);
