// ============================================
// Payments config - single source of truth for /payments + pricing + admin
// ============================================
// Pure data + helpers only (no React / lucide) so the public API route
// (/api/payments) and the client flow can both import it cheaply.

import { AVAILABLE_SCOPES } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";
import type { PackageTier } from "@/lib/tier";

export type PurchasablePackageId = "share" | "normal" | "vip" | "diamond";

/** Per-package accent. Gold = VIP (role-amber), diamond = sky, else primary. */
export type PackageAccent = "primary" | "gold" | "diamond";

/** A labelled group of feature i18n keys, shown in the "lihat semua" panel. */
export interface FeatureGroup {
  labelKey: string;
  itemKeys: string[];
}

export interface PackageDef {
  id: PurchasablePackageId;
  /** license_keys.package_tier granted on approval. */
  tier: PackageTier;
  /** Base price in IDR (before the unique-amount suffix). */
  price: number;
  /** Max devices a buyer may pick for this package. Share/Normal=2, VIP/Diamond=3. */
  maxDevices: number;
  /** Lucide icon name (component resolved in the UI layer). */
  icon: "Share2" | "GraduationCap" | "Crown" | "Gem";
  nameKey: string;
  badgeKey: string;
  descKey: string;
  /** Punchy one-line highlight shown on the compact card (NOT the full list). */
  shortKey: string;
  /** Full feature list, grouped — rendered in the popover/accordion. */
  featureGroups: FeatureGroup[];
  /** Flat feature keys (legacy / fallback). Superseded by featureGroups. */
  featureKeys: string[];
  /** Highlighted "most popular" card. */
  highlight?: boolean;
  /** Diamond gets the supporter framing + name glow advert. */
  supporter?: boolean;
  /** Small gold "Best Price to Value" pill — VIP only. */
  bestValue?: boolean;
}

/** Resolve a package's accent theme from its id. */
export function packageAccent(id: PurchasablePackageId): PackageAccent {
  if (id === "vip") return "gold";
  if (id === "diamond") return "diamond";
  return "primary";
}

export const PACKAGE_PRICES: Record<PurchasablePackageId, number> = {
  share: 25000,
  normal: 30000,
  vip: 35000,
  diamond: 50000,
};

/** LE86 class gets a special Share price (class promo). */
export const LE86_SHARE_PRICE = 20000;

/**
 * Effective base price for a buyer. LE86 + Share = Rp20.000 (flat, regardless
 * of share method); everything else = the package list price. Used by BOTH the
 * client flow and the server route so the unique amount, review, success-screen
 * WhatsApp text, admin alert email, and the buyer invoice email all agree.
 */
export function effectiveBasePrice(
  pkg: PurchasablePackageId,
  classCode: string
): number {
  if (pkg === "share" && classCode === "LE86") return LE86_SHARE_PRICE;
  return PACKAGE_PRICES[pkg];
}

/** Plain, locale-agnostic package names for server-side use (emails, push). */
export const PACKAGE_LABELS: Record<PurchasablePackageId, string> = {
  share: "Share",
  normal: "Normal",
  vip: "VIP",
  diamond: "Diamond",
};

// Order matters: rendered left→right on landing + the package picker.
export const PACKAGES: PackageDef[] = [
  {
    id: "share",
    tier: "share",
    price: 25000,
    maxDevices: 2,
    icon: "Share2",
    nameKey: "pricing.share_name",
    badgeKey: "pricing.share_badge",
    descKey: "pricing.share_desc",
    shortKey: "pricing.short_share",
    featureKeys: [
      "pricing.feat_all_subjects",
      "pricing.feat_quiz_flash",
      "pricing.feat_ai",
      "pricing.feat_forum",
      "pricing.feat_voice",
      "pricing.feat_max_device",
    ],
    featureGroups: [
      {
        labelKey: "pricing.grp_included",
        itemKeys: [
          "pricing.feat_all_subjects",
          "pricing.feat_quiz_flash",
          "pricing.feat_ai",
          "pricing.feat_forum",
          "pricing.feat_voice",
          "pricing.feat_max_device",
        ],
      },
    ],
  },
  {
    id: "normal",
    tier: "normal",
    price: 30000,
    maxDevices: 2,
    icon: "GraduationCap",
    nameKey: "pricing.normal_name",
    badgeKey: "pricing.normal_badge",
    descKey: "pricing.normal_desc",
    shortKey: "pricing.short_normal",
    featureKeys: [
      "pricing.feat_all_subjects",
      "pricing.feat_quiz_flash",
      "pricing.feat_ai",
      "pricing.feat_forum",
      "pricing.feat_voice",
      "pricing.feat_max_device",
    ],
    featureGroups: [
      {
        labelKey: "pricing.grp_included",
        itemKeys: [
          "pricing.feat_all_subjects",
          "pricing.feat_quiz_flash",
          "pricing.feat_ai",
          "pricing.feat_forum",
          "pricing.feat_voice",
          "pricing.feat_max_device",
        ],
      },
    ],
    highlight: true,
  },
  {
    id: "vip",
    tier: "vip",
    price: 35000,
    maxDevices: 3,
    icon: "Crown",
    nameKey: "pricing.vip_name",
    badgeKey: "pricing.vip_badge",
    descKey: "pricing.vip_desc",
    shortKey: "pricing.short_vip",
    featureKeys: [
      "pricing.feat_all_normal",
      "pricing.feat_ai_model",
      "pricing.feat_ai_priority",
      "pricing.feat_vip_lounge",
      "pricing.feat_dm",
      "pricing.feat_snippets",
      "pricing.feat_custom_accent",
      "pricing.feat_premium_fonts",
      "pricing.feat_voice_perks",
      "pricing.feat_vip_badge",
      "pricing.feat_fast_support",
    ],
    featureGroups: [
      { labelKey: "pricing.grp_included", itemKeys: ["pricing.feat_all_normal"] },
      { labelKey: "pricing.grp_ai", itemKeys: ["pricing.feat_ai_model", "pricing.feat_ai_priority"] },
      {
        labelKey: "pricing.grp_komunitas",
        itemKeys: ["pricing.feat_vip_lounge", "pricing.feat_dm", "pricing.feat_snippets"],
      },
      {
        labelKey: "pricing.grp_kustomisasi",
        itemKeys: ["pricing.feat_custom_accent", "pricing.feat_premium_fonts"],
      },
      {
        labelKey: "pricing.grp_lainnya",
        itemKeys: ["pricing.feat_voice_perks", "pricing.feat_vip_badge", "pricing.feat_fast_support"],
      },
    ],
    bestValue: true,
  },
  {
    id: "diamond",
    tier: "diamond",
    price: 50000,
    maxDevices: 3,
    icon: "Gem",
    nameKey: "pricing.diamond_name",
    badgeKey: "pricing.diamond_badge",
    descKey: "pricing.diamond_desc",
    shortKey: "pricing.short_diamond",
    featureKeys: [
      "pricing.feat_all_vip",
      "pricing.feat_name_glow",
      "pricing.feat_diamond_badge",
      "pricing.feat_support_dev",
    ],
    featureGroups: [
      { labelKey: "pricing.grp_all_vip", itemKeys: ["pricing.feat_all_vip"] },
      {
        labelKey: "pricing.grp_eksklusif",
        itemKeys: ["pricing.feat_name_glow", "pricing.feat_diamond_badge"],
      },
      { labelKey: "pricing.grp_dukungan", itemKeys: ["pricing.feat_support_dev"] },
    ],
    supporter: true,
  },
];

export function getPackage(id: string): PackageDef | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/** Max devices selectable for a package (Share/Normal=2, VIP/Diamond=3). */
export const packageMaxDevices = (id: PurchasablePackageId): number =>
  PACKAGES.find((p) => p.id === id)?.maxDevices ?? 2;

// ─── Payment accounts (confirmed by owner; shown on the payment step) ───
export const PAYMENT_ACCOUNTS = {
  bca: { id: "bca", label: "BCA", number: "5222213886", holder: "Haidar Shofwan Bani" },
  ewallet: {
    id: "ewallet",
    label: "GoPay / ShopeePay / DANA / OVO",
    number: "087839256171",
    holder: "Haidar Shofwan Bani",
  },
  qrisImage: "/payment/qris.jpg",
} as const;

// Methods offered on the payment step (radio).
export const PAYMENT_METHODS = [
  { id: "bca", labelKey: "payments.method_bca" },
  { id: "ewallet", labelKey: "payments.method_ewallet" },
  { id: "qris", labelKey: "payments.method_qris" },
] as const;
export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

// Admin WhatsApp (success screen "contact admin"). Matches support-panel.
export const WA_ADMIN = "6287839256171";

// ─── Form option sets ───
export const CAMPUSES = ["Bekasi", "Kemanggisan", "Alam Sutera", "Other"] as const;

export const DEVICE_OPTIONS = [1, 2, 3] as const;

export const SOURCES = [
  { id: "wa_group", labelKey: "payments.source_wa_group" },
  { id: "friend", labelKey: "payments.source_friend" },
  { id: "instagram", labelKey: "payments.source_instagram" },
  { id: "line", labelKey: "payments.source_line" },
  { id: "developer", labelKey: "payments.source_developer" },
  { id: "other", labelKey: "payments.source_other" },
] as const;

// ─── Upload limits (mirrored server-side in /api/payments) ───
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // reject >5MB before compress
export const PROOF_TARGET_BYTES = 500 * 1024; // compress target per image
export const PROOF_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * Unique transfer amount = base price + last 3 digits of the WhatsApp number.
 * Deterministic per buyer so the admin can match the incoming transfer to a
 * pending request. e.g. VIP 35000 + WA …171 → 35171.
 */
export function computeUniqueAmount(basePrice: number, whatsapp: string): number {
  const digits = (whatsapp || "").replace(/\D/g, "");
  if (!digits) return basePrice;
  const last3 = digits.slice(-3);
  const n = parseInt(last3, 10);
  return basePrice + (Number.isFinite(n) ? n : 0);
}

/** Format IDR like "Rp 35.171". */
export function formatIDR(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

/** Scopes (exam periods) a buyer can purchase for. */
export function purchasableScopes(): ScopeTuple[] {
  return AVAILABLE_SCOPES;
}
