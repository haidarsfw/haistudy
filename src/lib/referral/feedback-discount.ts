// ============================================
// The evaluation-form thank-you discount
// ============================================
//
//   15% off the list price, any package, ONCE per address, no expiry.
//
// Held as an allowlist of e-mail addresses instead of a coupon code. When the
// form went out, almost none of the people answering had an account yet, so
// there was nothing to attach a credit to. An address, on the other hand,
// matches whenever they eventually buy — and there is no code to leak, nothing
// for anyone to remember, and nothing wasted on the ones who never come back.
//
// It does not stack with the referral discounts. See `availableDiscounts` in
// ./rewards: the largest wins and the losers are left untouched, not burned.

import type { SupabaseClient } from "@supabase/supabase-js";

import { feedbackAmountFor } from "@/lib/referral/discount-pricing";

/** Fallback when a row does not name its own percentage. */
export const FEEDBACK_DISCOUNT_PERCENT = 15;

/**
 * Rupiah off a purchase at this price, plus the percentage it came from.
 * Both zero if there is no entry, or it has already been used.
 *
 * The percentage is handed back, not just the rupiah, because this discount
 * MOVES when the buyer changes package: 15% of Share is Rp3.750 and 15% of
 * Diamond is Rp7.500. The checkout screen has to recompute it the moment the
 * package changes, or the amount it tells the buyer to transfer stops matching
 * the amount the server records — and that figure is the only thing the admin
 * has to match the incoming payment against.
 */
export async function feedbackDiscountFor(
  supabase: SupabaseClient,
  emailLower: string,
  listPrice: number
): Promise<{ percent: number; amount: number }> {
  const none = { percent: 0, amount: 0 };
  const email = String(emailLower ?? "").trim().toLowerCase();
  if (!email) return none;

  const { data } = await supabase
    .from("feedback_discounts")
    .select("percent, used_at")
    .eq("email_lower", email)
    .maybeSingle();

  if (!data || data.used_at) return none;

  // Read per row, so a future round can be worth something different without a
  // deploy.
  const percent = (data.percent as number) ?? FEEDBACK_DISCOUNT_PERCENT;
  return { percent, amount: feedbackAmountFor(listPrice, percent) };
}

/**
 * Spend it.
 *
 * Conditional on `used_at` still being null, so two orders submitted at the
 * same moment cannot both claim it — the second update matches no rows. Same
 * guard as the referee discount, and for the same reason.
 */
export async function consumeFeedbackDiscount(
  supabase: SupabaseClient,
  emailLower: string,
  accountId: string,
  amount: number
): Promise<void> {
  const email = String(emailLower ?? "").trim().toLowerCase();
  if (!email || amount <= 0) return;

  await supabase
    .from("feedback_discounts")
    .update({
      used_at: new Date().toISOString(),
      used_by_account: accountId,
      used_amount: amount,
    })
    .eq("email_lower", email)
    .is("used_at", null);
}
