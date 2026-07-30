// ============================================
// The class promo
// ============================================
//
// Only the class the owner is sitting in, only for that exam period. A class he
// has left keeps nothing, which is the whole reason this is a table and not a
// constant: the old `LE86_SHARE_PRICE` kept discounting last year's classmates
// forever, and moving it took a deploy.
//
// 15%, Share package only. Both decided by the owner on 2026-07-30 — 15% to
// match the evaluation discount, because he has already told people "15%" and
// two different percentages that cannot stack only invite "why did I get the
// smaller one".
//
// The class is typed by the buyer and nothing verifies it. That is deliberate:
// every purchase is approved by hand, so the owner sees the class before the
// licence is issued, and a made-up class code is caught by the same person who
// checks the transfer.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ScopeTuple } from "@/types/scope";
import { normalizeClassCode } from "@/data/landing/campus";
import {
  feedbackAmountFor,
  type DiscountOption,
} from "@/lib/referral/discount-pricing";

/**
 * Packages the class promo applies to.
 *
 * Share only, matching what the old promo covered. Kept as a set rather than an
 * `=== "share"` so widening it later is one line here instead of a hunt through
 * the checkout.
 */
const PROMO_PACKAGES = new Set(["share"]);

export interface ClassPromo {
  classCode: string;
  scopeKey: string;
  percent: number;
}

/**
 * Every live class promo, small enough to hand to the browser whole.
 *
 * Sent to the checkout because eligibility depends on things the server has not
 * seen yet when the page renders — the class the buyer is about to type, the
 * package they are about to pick. The screen needs them to quote the right
 * transfer amount; the server recomputes the same thing when the order lands,
 * so nothing here can be talked down from a browser.
 *
 * Nothing private in it: "class LE86 gets 15% this period" is a poster, not a
 * secret.
 */
export async function listClassPromos(
  supabase: SupabaseClient
): Promise<ClassPromo[]> {
  const { data, error } = await supabase
    .from("class_discounts")
    .select("class_code, semester, exam_period, jurusan, percent")
    .limit(200);

  if (error || !data) return [];
  return data.map((r) => ({
    classCode: r.class_code as string,
    scopeKey: `s${r.semester}-${r.exam_period}-${r.jurusan}`,
    percent: (r.percent as number) ?? 0,
  }));
}

export interface ClassPromoContext {
  /** Whatever the buyer typed, normalized here so callers cannot forget. */
  classCode: string;
  scopeKey: string;
  pkg: string;
}

/**
 * The class promo as a discount, or null. Pure — same answer on both sides.
 */
export function classDiscountOption(
  promos: readonly ClassPromo[],
  ctx: ClassPromoContext,
  listPrice: number
): DiscountOption | null {
  if (!PROMO_PACKAGES.has(ctx.pkg)) return null;

  const code = normalizeClassCode(ctx.classCode);
  if (!code) return null;

  const hit = promos.find(
    (p) => p.classCode === code && p.scopeKey === ctx.scopeKey
  );
  if (!hit || hit.percent <= 0) return null;

  const amount = feedbackAmountFor(listPrice, hit.percent);
  if (amount <= 0) return null;

  return {
    id: "class",
    label: `Promo kelas ${code}`,
    detail: `Potongan ${hit.percent}% untuk paket Share`,
    amount,
    percent: hit.percent,
  };
}

/** Does this class have a promo in this period at all? Drives the share rules. */
export function isPromoClass(
  promos: readonly ClassPromo[],
  classCode: string,
  scopeKey: string
): boolean {
  const code = normalizeClassCode(classCode);
  if (!code) return false;
  return promos.some((p) => p.classCode === code && p.scopeKey === scopeKey);
}

/** Server-side lookup for one buyer. Authoritative; the screen only previews. */
export async function classDiscountFor(
  supabase: SupabaseClient,
  scope: ScopeTuple,
  classCode: string,
  pkg: string,
  listPrice: number
): Promise<{ option: DiscountOption | null; promoClass: boolean }> {
  const scopeKey = `s${scope.semester}-${scope.examPeriod}-${scope.jurusan}`;
  const promos = await listClassPromos(supabase);
  return {
    option: classDiscountOption(promos, { classCode, scopeKey, pkg }, listPrice),
    promoClass: isPromoClass(promos, classCode, scopeKey),
  };
}
