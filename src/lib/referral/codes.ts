// ============================================
// Referral codes
// ============================================
//
// A code belongs to an ACCOUNT, which is permanent, rather than to a licence,
// which expires at the end of every exam period. The old scheme put it on the
// activation row: 233 codes were minted that way and exactly one was ever
// used, which is what happens when a code is invisible and stops working after
// a month.
//
// Three kinds, all in one table so a single lookup answers "is this real?":
//
//   account   one per account, minted at signup, shown on /account
//   campaign  minted by the admin, belongs to nobody, can be capped and expired
//   legacy    carried over from activations.referral_code by migration 061
//
// Server-only. `referral_codes` has RLS on with no policies, so nothing here
// works with the anon key by design — the table is a map of who recruited
// whom, which is not something a public key should be able to read.

import type { SupabaseClient } from "@supabase/supabase-js";

import { recordRateEvent } from "@/lib/auth/account-rate-limit";

// Same alphabet as the licence generator. No 0/O/1/I/L, because these get read
// off a WhatsApp message and retyped by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUP = 4;

export const REFERRAL_CODE_MAX = 32;

export type ReferralKind = "account" | "campaign" | "legacy";

export interface ReferralCode {
  code: string;
  kind: ReferralKind;
  /** The owner, when there is one. Campaign codes have none. */
  accountId: string | null;
  label: string;
  uses: number;
}

/**
 * What the user typed, turned into what we store.
 *
 * Case and spacing are thrown away, and so are the dashes — someone copying
 * "ref-ab12-cd34" out of a chat message, or typing it without dashes at all,
 * is not making a mistake. The canonical form is rebuilt afterwards.
 */
export function normalizeReferralCode(raw: string): string {
  const bare = String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, REFERRAL_CODE_MAX);
  if (!bare) return "";
  // The retired shape: REF + 8 characters. Anything else (personal codes built
  // from a nickname, campaign words, old hand-made codes) is kept exactly as
  // typed, minus the punctuation.
  if (/^REF[A-Z0-9]{8}$/.test(bare)) {
    return `REF-${bare.slice(3, 7)}-${bare.slice(7)}`;
  }
  return bare;
}

/**
 * Both spellings a typed code could legitimately be stored as.
 *
 * The dash-reinsertion above is a guess, and it is wrong for exactly one case:
 * someone called Refiansyah gets the personal code REFIANSYAHK4, which is REF
 * followed by eight characters and therefore looks like the old format. The
 * guess would rewrite it to REF-IANS-YAHK4 and find nothing.
 *
 * Rather than legislate against a real name, every lookup asks for both forms.
 * Codes are unique across the table, so at most one can match.
 */
export function referralCodeCandidates(raw: string): string[] {
  const canonical = normalizeReferralCode(raw);
  if (!canonical) return [];
  const bare = canonical.replace(/-/g, "");
  return canonical === bare ? [canonical] : [canonical, bare];
}

function randomChars(n: number): string {
  let out = "";
  const bytes = new Uint32Array(n);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function randomBlock(): string {
  return randomChars(GROUP);
}

/** The two characters that tell two people with the same name apart. */
function randomPair(): string {
  return randomChars(2);
}

/**
 * The readable half of a personal code, taken from the nickname.
 *
 * Returns "" when there is nothing usable to build on — an account that has
 * not been through checkout yet has no nickname, and a code invented from
 * nothing is worse than the random one it would replace.
 */
export function codeStem(nickname: string): string {
  const stem = String(nickname ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  return stem.length >= 3 ? stem : "";
}

/**
 * Mint the one personal code an account gets.
 *
 * Collisions are resolved by the primary key rather than by a pre-flight
 * SELECT: two signups landing on the same string in the same millisecond is
 * vanishingly unlikely, but a check-then-insert would still let it through,
 * and the unique index would not.
 *
 * Returns the existing code if the account already has one, so this is safe to
 * call from anywhere.
 */
export async function mintAccountReferralCode(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  const existing = await getAccountReferralCode(supabase, accountId);
  if (existing) return existing;

  // Built from the nickname, because these codes are read out loud and typed
  // by hand. "HAIDAR42" survives a WhatsApp message; "REF-4CCB-WERC" does not.
  // The two trailing characters are what let two people called Haidar both
  // have one, and they also mean a code stays valid after its owner renames
  // themselves — a freed-up nickname can be taken by someone else, and their
  // code must not collide with the original.
  const { data: acc } = await supabase
    .from("accounts")
    .select("nickname")
    .eq("id", accountId)
    .maybeSingle();

  const stem = codeStem(String(acc?.nickname ?? ""));

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = stem ? `${stem}${randomPair()}` : `REF-${randomBlock()}-${randomBlock()}`;
    const { error } = await supabase
      .from("referral_codes")
      .insert({ code, kind: "account", account_id: accountId });

    if (!error) return code;
    // 23505 = unique violation. Either the code collided (retry) or this
    // account already has one (someone else got there first — return theirs).
    if (error.code === "23505") {
      const raced = await getAccountReferralCode(supabase, accountId);
      if (raced) return raced;
      continue;
    }
    console.error("[referral] mint failed", error);
    return null;
  }
  return null;
}

/**
 * Every code that credits this account, not just the current one.
 *
 * Renaming a personal code leaves the old string behind as a `legacy` row
 * pointing at the same person, so a code a friend wrote down last term keeps
 * working forever. Anything counting recruits has to count across all of them
 * — otherwise renaming a code silently zeroes its owner's history.
 */
export async function listAccountReferralCodes(
  supabase: SupabaseClient,
  accountId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("account_id", accountId);
  return (data ?? []).map((r) => r.code as string);
}

export async function getAccountReferralCode(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("account_id", accountId)
    .eq("kind", "account")
    .maybeSingle();
  return (data?.code as string) ?? null;
}

/**
 * Is this code real and still usable?
 *
 * Returns null for "no", with no distinction between never-existed, switched
 * off, expired and used up. That sameness is deliberate: telling the
 * difference is exactly the signal someone walking the code space would use
 * (OWASP OAT-002). The admin panel can see the real reason; a stranger at the
 * signup form cannot.
 */
export async function lookupReferralCode(
  supabase: SupabaseClient,
  rawCode: string
): Promise<ReferralCode | null> {
  const candidates = referralCodeCandidates(rawCode);
  if (!candidates.length) return null;

  const { data, error } = await supabase
    .from("referral_codes")
    .select("code, kind, account_id, label, active, uses, max_uses, expires_at")
    .in("code", candidates)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  if (!data.active) return null;
  if (data.expires_at && new Date(data.expires_at as string).getTime() < Date.now()) {
    return null;
  }
  if (typeof data.max_uses === "number" && (data.uses as number) >= data.max_uses) {
    return null;
  }

  return {
    code: data.code as string,
    kind: data.kind as ReferralKind,
    accountId: (data.account_id as string | null) ?? null,
    label: (data.label as string) ?? "",
    uses: (data.uses as number) ?? 0,
  };
}

/**
 * Record that an account arrived through a code.
 *
 * Attaching is NOT crediting. `credited_at` stays null until the referee
 * actually pays for something, because a referral program that pays out on
 * signups pays out on throwaway addresses.
 *
 * Self-referral is refused here rather than in the form: the form can be
 * skipped, this cannot.
 */
export async function attachReferral(
  supabase: SupabaseClient,
  accountId: string,
  rawCode: string
): Promise<boolean> {
  const found = await lookupReferralCode(supabase, rawCode);
  if (!found) return false;
  if (found.accountId && found.accountId === accountId) return false;

  const { error } = await supabase
    .from("referral_uses")
    .insert({ code: found.code, account_id: accountId });

  // Unique violation means this account already has a referrer. One per
  // account, permanently — otherwise attribution could be rewritten later.
  if (error) return error.code === "23505" ? false : false;

  // Advisory counter for the admin list. The authoritative number is
  // count(referral_uses), so a lost increment costs a display, not money.
  await supabase.rpc("bump_referral_uses", { p_code: found.code }).then(
    () => undefined,
    () => undefined
  );

  return true;
}

// ─── Guardrail for the public "is this code valid?" endpoint ───
//
// A yes/no oracle on a code space is something to be walked, not used. A real
// student checks one code, maybe two after a typo; anything past that is not a
// student. Counted per network, in the database, because a limit held in the
// browser is undone by the person it is aimed at.

const CHECK_MAX = 12;
const CHECK_WINDOW_MS = 15 * 60_000;

export async function checkReferralCheckQuota(
  supabase: SupabaseClient,
  ip: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  if (!ip || ip === "unknown") return { allowed: true, retryAfter: 0 };

  const since = new Date(Date.now() - CHECK_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("account_rate_events")
    .select("created_at")
    .eq("kind", "referral_check")
    .eq("subject", `ip:${ip}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(CHECK_MAX + 1);

  // Fails open. A limiter that throws would take down the thing it protects.
  if (error || !data || data.length < CHECK_MAX) return { allowed: true, retryAfter: 0 };

  const oldest = new Date(data[data.length - 1].created_at).getTime();
  const until = oldest + CHECK_WINDOW_MS;
  return {
    allowed: false,
    retryAfter: Math.max(30, Math.ceil((until - Date.now()) / 1000)),
  };
}

export async function recordReferralCheck(
  supabase: SupabaseClient,
  ip: string
): Promise<void> {
  if (!ip || ip === "unknown") return;
  await recordRateEvent(supabase, "referral_check", `ip:${ip}`, ip);
}
