// ============================================
// Payments config - single source of truth for /payments + pricing + admin
// ============================================
// Pure data + helpers only (no React / lucide) so the public API route
// (/api/payments) and the client flow can both import it cheaply.

import { AVAILABLE_SCOPES, PURCHASABLE_SCOPES } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";
import type { PackageTier } from "@/lib/tier";

export type PurchasablePackageId = "share" | "normal" | "vip" | "diamond";

/** Per-package accent. Gold = VIP (role-amber), diamond = sky, else primary. */
export type PackageAccent = "primary" | "gold" | "diamond";

/**
 * Sentinel item key: renders the package's real `maxDevices` instead of a fixed
 * string. A literal "Max 2 device" key used to sit in Share/Normal's list while
 * VIP/Diamond only said "semua fitur Normal", so their 3-device allowance was
 * never stated and was actively contradicted. Same idiom as the landing card's
 * `{ key: "quota", quota: true }` marker.
 */
export const MAX_DEVICES_ITEM = "__max_devices";

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

/**
 * The prices. Declared once.
 *
 * PACKAGES used to repeat each number in its own `price` field, and nothing
 * compared the two. The cards read one, `effectiveBasePrice` read the other,
 * and an edit to either would have shown a buyer a figure the server did not
 * charge.
 */
export const PACKAGE_PRICES: Record<PurchasablePackageId, number> = {
  share: 25000,
  normal: 30000,
  vip: 35000,
  diamond: 50000,
};

/**
 * The list price of a package. One number, the same for everyone.
 *
 * This used to special-case `LE86 + Share = Rp20.000`, a class promo pinned into
 * the code. It was replaced on 2026-07-30 by `class_discounts`, a table of
 * (class, exam period) → percent: the owner's real rule is only the class HE IS
 * SITTING IN, only for THAT period, and a constant cannot express "only this
 * semester" — it kept discounting last year's classmates and took a deploy to
 * move.
 *
 * The class promo is now a DISCOUNT rather than a different price, which also
 * makes it visible: the buyer sees the full price struck through and what came
 * off, instead of a cheaper number with no explanation.
 */
export function effectiveBasePrice(
  pkg: PurchasablePackageId,
  _classCode?: string
): number {
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
    price: PACKAGE_PRICES.share,
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
      MAX_DEVICES_ITEM,
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
          MAX_DEVICES_ITEM,
        ],
      },
    ],
  },
  {
    id: "normal",
    tier: "normal",
    price: PACKAGE_PRICES.normal,
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
      MAX_DEVICES_ITEM,
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
          MAX_DEVICES_ITEM,
        ],
      },
    ],
  },
  {
    id: "vip",
    tier: "vip",
    price: PACKAGE_PRICES.vip,
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
      MAX_DEVICES_ITEM,
    ],
    featureGroups: [
      {
        labelKey: "pricing.grp_included",
        itemKeys: ["pricing.feat_all_normal", MAX_DEVICES_ITEM],
      },
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
    highlight: true,
  },
  {
    id: "diamond",
    tier: "diamond",
    price: PACKAGE_PRICES.diamond,
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
      MAX_DEVICES_ITEM,
    ],
    featureGroups: [
      {
        labelKey: "pricing.grp_all_vip",
        itemKeys: ["pricing.feat_all_vip", MAX_DEVICES_ITEM],
      },
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
// CAMPUSES lived here and ended in the literal "Other", a token no other screen
// understood. Campus locations belong to CAMPUS_OPTIONS in
// src/data/landing/campus.ts, whose escape hatch is OTHER_LOCATION ("Lainnya"),
// and checkout has always used that one. Two lists meant the account page could
// store a value checkout could not read back.

export const DEVICE_OPTIONS = [1, 2, 3] as const;

export const SOURCES = [
  { id: "wa_group", labelKey: "payments.source_wa_group" },
  { id: "friend", labelKey: "payments.source_friend" },
  { id: "instagram", labelKey: "payments.source_instagram" },
  { id: "line", labelKey: "payments.source_line" },
  { id: "developer", labelKey: "payments.source_developer" },
  { id: "other", labelKey: "payments.source_other" },
] as const;

// ─── Upload limits ───
// This MUST match MAX_UPLOAD_BYTES in /api/payments. It said 5MB while the
// server refused anything over 3MB, so a 4MB screenshot passed every check the
// buyer could see and was rejected after the upload.
export const PROOF_MAX_BYTES = 3 * 1024 * 1024; // matches the server's cap
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

/**
 * Exam periods a buyer can actually pay for.
 *
 * Deliberately NOT every period the app knows about: a period still being
 * written is reachable and listed, but selling it would take money for an empty
 * app. The same list is enforced server-side in /api/payments.
 */
export function purchasableScopes(): ScopeTuple[] {
  return PURCHASABLE_SCOPES;
}

/**
 * Every period offered in the picker, sellable or not. The ones that are not
 * sellable render disabled with a "Segera" hint — showing them is how a buyer
 * learns their period is coming instead of assuming it will never exist.
 */
export function offeredScopes(): ScopeTuple[] {
  return AVAILABLE_SCOPES;
}
