// ============================================
// What a discount is worth, and which one wins
// ============================================
//
// Pure arithmetic, no database, no server imports — because BOTH sides have to
// run it and get the same answer. The checkout screen quotes a transfer amount
// before anything is submitted; the server recomputes it when the order lands.
// That figure is the only thing the admin has to match an incoming payment
// against, so the two must never disagree by a single rupiah.
//
// This used to be safe by accident: every discount was a fixed number of
// rupiah, so "cap it at the price" was the whole rule and both sides could
// write it separately. A percentage discount breaks that. It is worth Rp3.750
// on Share and Rp7.500 on Diamond, which means the amount AND the winner can
// both change the moment the buyer picks a different package.

export interface DiscountOption {
  id: string;
  label: string;
  detail: string;
  /** Rupiah off, computed against the price it was priced for. */
  amount: number;
  /**
   * Set only on percentage discounts. Anything holding one of these must
   * re-price it whenever the package changes — see `priceDiscount`.
   */
  percent?: number;
}

/** Rupiah off a purchase at this price, from a percentage. Never a refund. */
export function feedbackAmountFor(listPrice: number, percent: number): number {
  if (percent <= 0 || listPrice <= 0) return 0;
  return Math.min(Math.round((listPrice * percent) / 100), listPrice);
}

/** What this discount is actually worth against this price. */
export function priceDiscount(option: DiscountOption, listPrice: number): number {
  if (option.percent && option.percent > 0) {
    return feedbackAmountFor(listPrice, option.percent);
  }
  return Math.min(option.amount, listPrice);
}

/**
 * The one that gets applied: the largest, re-priced against THIS package.
 *
 * Re-picking rather than trusting an earlier winner matters. Someone holding
 * Rp5.000 of referral balance and a 15% voucher sees the balance win on Share
 * (Rp5.000 beats Rp3.750) and the voucher win on Diamond (Rp7.500 beats
 * Rp5.000). A screen that decided once, on the cheapest package, would quote
 * the wrong discount and therefore the wrong transfer amount.
 *
 * Ties go to the earlier option, which keeps the order stable rather than
 * flipping between two equal discounts as the package changes.
 */
export function pickBestDiscount(
  options: readonly DiscountOption[],
  listPrice: number
): { best: DiscountOption | null; amount: number } {
  let best: DiscountOption | null = null;
  let amount = 0;
  for (const o of options) {
    const value = priceDiscount(o, listPrice);
    if (value > amount) {
      best = o;
      amount = value;
    }
  }
  return { best, amount };
}
