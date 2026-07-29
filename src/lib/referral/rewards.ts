// ============================================
// Referral rewards
// ============================================
//
//   referee   Rp5.000 off, once, and ONLY on an account's first purchase
//   referrer  Rp5.000 of BALANCE per friend whose purchase is APPROVED
//             5 friends = Rp25.000 = one Share period free
//
// Three properties hold this together, and each one closes a hole:
//
//   A code can only be attached at REGISTRATION, once per account. So the ~88%
//   of buyers who are returning cannot claim the referee discount at all. If
//   they could, it would cost about a quarter of revenue to give money to
//   people who were buying anyway.
//
//   The referrer is paid only when the friend's purchase is APPROVED — after a
//   real transfer of roughly Rp20.000. Spending Rp20.000 to earn Rp5.000 is a
//   losing trade, which is what makes farming pointless.
//
//   Balance, not cash. Nothing has to be transferred by hand, and the money
//   never actually leaves: it can only become a future purchase that would not
//   otherwise have happened.
//
// Balance accumulates and carries over deliberately. Capping it at one free
// period would stop the exact person solving the acquisition problem: ten
// friends earn Rp50.000 of balance, but those ten paid about Rp200.000.

import type { SupabaseClient } from "@supabase/supabase-js";

import { listAccountReferralCodes } from "@/lib/referral/codes";

/** Off the referee's first purchase. */
export const REFEREE_DISCOUNT = 5000;
/** Balance the referrer earns per approved friend. */
export const REFERRER_CREDIT = 5000;
/**
 * Friends needed for a free Share period — 5 × Rp5.000 = Rp25.000.
 *
 * The account page draws its progress track from this alone. There used to be a
 * hand-written five-rung table here as well, listing Rp5.000 / Rp10.000 / … ,
 * which was two things at once: a second copy of a number this file already
 * decides, and a shape that made each rung look like its own separate prize
 * rather than one running total.
 */
export const FREE_PERIOD_TARGET = 5;

export interface ReferralProgress {
  /** Friends who bought and were approved. */
  credited: number;
  /** Signed up with the code but have not bought yet. */
  pending: number;
  /** Spendable right now, in rupiah. */
  balance: number;
  /** Earned across all time, spent or not. */
  earnedTotal: number;
  /** Friends still needed for a free Share period, 0 once reached. */
  toFree: number;
  /** When the oldest unspent credit runs out, if any. */
  expiringAt: string | null;
}

/** Unspent, unexpired balance. */
export async function referralBalance(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { data } = await supabase
    .from("referral_credits")
    .select("amount, expires_at")
    .eq("account_id", accountId)
    .is("spent_at", null);

  const now = Date.now();
  return (data ?? [])
    .filter((c) => new Date(c.expires_at as string).getTime() > now)
    .reduce((sum, c) => sum + ((c.amount as number) ?? 0), 0);
}

/** Everything the account page needs about someone's own code. */
export async function getReferralProgress(
  supabase: SupabaseClient,
  accountId: string,
  code: string | null
): Promise<ReferralProgress> {
  const empty: ReferralProgress = {
    credited: 0,
    pending: 0,
    balance: 0,
    earnedTotal: 0,
    toFree: FREE_PERIOD_TARGET,
    expiringAt: null,
  };
  // Every code that credits them, current and retired. An account keeps its
  // old code as a still-working alias when the readable one is regenerated, so
  // counting a single string would wipe out the history of anyone renamed.
  const codes = await listAccountReferralCodes(supabase, accountId);
  if (!codes.length && code) codes.push(code);
  if (!codes.length) return empty;

  const [{ data: uses }, { data: credits }] = await Promise.all([
    supabase.from("referral_uses").select("credited_at").in("code", codes),
    supabase
      .from("referral_credits")
      .select("amount, expires_at, spent_at")
      .eq("account_id", accountId),
  ]);

  const credited = (uses ?? []).filter((u) => u.credited_at).length;
  const now = Date.now();
  const live = (credits ?? []).filter(
    (c) => !c.spent_at && new Date(c.expires_at as string).getTime() > now
  );

  return {
    credited,
    pending: (uses ?? []).length - credited,
    balance: live.reduce((s, c) => s + ((c.amount as number) ?? 0), 0),
    earnedTotal: (credits ?? []).reduce((s, c) => s + ((c.amount as number) ?? 0), 0),
    toFree: Math.max(0, FREE_PERIOD_TARGET - credited),
    expiringAt:
      live
        .map((c) => c.expires_at as string)
        .sort()
        .at(0) ?? null,
  };
}

// ─── The referee's one-off discount ───

/**
 * Is this account owed the newcomer's discount?
 *
 * Only if they arrived through someone's code AND have never spent it. There
 * is at most one `referral_uses` row per account, created at registration and
 * never afterwards, which is precisely why a returning customer cannot reach
 * this.
 */
export async function refereeDiscountFor(
  supabase: SupabaseClient,
  accountId: string
): Promise<number> {
  const { data } = await supabase
    .from("referral_uses")
    .select("discount_applied")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!data) return 0;
  return (data.discount_applied as number) > 0 ? 0 : REFEREE_DISCOUNT;
}

/**
 * Spend it.
 *
 * Conditional on it still being zero, so two orders submitted at the same
 * moment cannot both claim it — the second update matches no rows.
 */
export async function consumeRefereeDiscount(
  supabase: SupabaseClient,
  accountId: string,
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  await supabase
    .from("referral_uses")
    .update({ discount_applied: amount })
    .eq("account_id", accountId)
    .eq("discount_applied", 0);
}

// ─── Choosing between discounts ───

export interface DiscountOption {
  id: "referral_balance" | "referee" | "feedback";
  label: string;
  detail: string;
  amount: number;
}

export interface DiscountChoice {
  /** The one being applied — always the largest. */
  best: DiscountOption | null;
  /** The others, kept for next time rather than burned. */
  others: DiscountOption[];
}

/**
 * Every discount this account could use, largest first.
 *
 * They do NOT stack — the owner's call, and the industry norm. The largest is
 * applied automatically and the rest are LEFT ALONE, not consumed, so a
 * voucher that lost to a bigger balance is still there next period. Burning
 * the loser is the classic way this pattern is got wrong.
 */
export async function availableDiscounts(
  supabase: SupabaseClient,
  accountId: string,
  listPrice: number
): Promise<DiscountChoice> {
  const [balance, referee] = await Promise.all([
    referralBalance(supabase, accountId),
    refereeDiscountFor(supabase, accountId),
  ]);

  const options: DiscountOption[] = [];

  if (balance > 0) {
    options.push({
      id: "referral_balance",
      label: "Saldo referral",
      // Capped at the price: balance is not a refund, and the leftover stays
      // in the ledger for next period.
      detail: "Dari teman yang kamu ajak",
      amount: Math.min(balance, listPrice),
    });
  }
  if (referee > 0) {
    options.push({
      id: "referee",
      label: "Kode referral teman",
      detail: "Potongan sekali untuk pembeli baru",
      amount: Math.min(referee, listPrice),
    });
  }

  options.sort((a, b) => b.amount - a.amount);
  return { best: options[0] ?? null, others: options.slice(1) };
}

// ─── Paying the referrer ───

/**
 * The friend's purchase went through — credit whoever sent them.
 *
 * Called from the approval route. Everything is idempotent: the unique index
 * on `referral_use_id` means approving the same purchase twice cannot pay
 * twice, even if this whole function runs again.
 */
export async function creditReferralOnApproval(
  supabase: SupabaseClient,
  refereeAccountId: string
): Promise<void> {
  const { data: use } = await supabase
    .from("referral_uses")
    .select("id, code, credited_at")
    .eq("account_id", refereeAccountId)
    .maybeSingle();
  if (!use) return;

  if (!use.credited_at) {
    await supabase
      .from("referral_uses")
      .update({ credited_at: new Date().toISOString() })
      .eq("id", use.id)
      .is("credited_at", null);
  }

  // Campaign codes have no owner, so nobody is paid — correct, since a promo
  // code is the owner's own marketing rather than a referral.
  const { data: owner } = await supabase
    .from("referral_codes")
    .select("account_id")
    .eq("code", use.code as string)
    .maybeSingle();
  const referrerId = (owner?.account_id as string | null) ?? null;
  if (!referrerId) return;
  if (referrerId === refereeAccountId) return; // cannot refer yourself

  const { error } = await supabase.from("referral_credits").insert({
    account_id: referrerId,
    amount: REFERRER_CREDIT,
    source: "referral",
    referral_use_id: use.id,
  });
  // 23505 = already credited for this referral. The normal case on a re-run.
  if (error && error.code !== "23505") {
    console.error("[referral] credit failed", error);
  }
}

/**
 * Spend balance on an order.
 *
 * Oldest credits first, so the ones closest to expiring are used before they
 * are lost. Partial spends are handled by splitting the credit in two rather
 * than tracking a remainder on the row — one row, one state, always auditable.
 */
export async function spendReferralBalance(
  supabase: SupabaseClient,
  accountId: string,
  amount: number,
  purchaseId: string
): Promise<void> {
  if (amount <= 0) return;

  const { data } = await supabase
    .from("referral_credits")
    .select("id, amount, expires_at")
    .eq("account_id", accountId)
    .is("spent_at", null)
    .order("expires_at", { ascending: true });

  const now = Date.now();
  const live = (data ?? []).filter(
    (c) => new Date(c.expires_at as string).getTime() > now
  );

  let left = amount;
  const spentAt = new Date().toISOString();

  for (const credit of live) {
    if (left <= 0) break;
    const value = (credit.amount as number) ?? 0;

    if (value <= left) {
      await supabase
        .from("referral_credits")
        .update({ spent_at: spentAt, spent_on: purchaseId })
        .eq("id", credit.id)
        .is("spent_at", null);
      left -= value;
      continue;
    }

    // Only part of this credit is needed. Split it: the used half is marked
    // spent, the remainder becomes a fresh row with the same expiry.
    await supabase
      .from("referral_credits")
      .update({ amount: left, spent_at: spentAt, spent_on: purchaseId })
      .eq("id", credit.id)
      .is("spent_at", null);
    await supabase.from("referral_credits").insert({
      account_id: accountId,
      amount: value - left,
      source: "referral",
      note: "sisa saldo",
      expires_at: credit.expires_at,
    });
    left = 0;
  }
}
