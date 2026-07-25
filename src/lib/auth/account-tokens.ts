// ============================================
// account_tokens — e-mail verification and password reset
// ============================================
//
// The raw token goes in the e-mail and is never written down; only its
// SHA-256 is stored, so this table leaking cannot be replayed into an account.
// Reuses createResetToken/hashResetToken from password.ts rather than growing
// a second hashing scheme.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createResetToken, hashResetToken } from "@/lib/auth/password";

export type TokenPurpose = "verify" | "reset";

// A verification link should survive a weekend in a crowded inbox. A reset
// link is a live credential, so it gets an hour.
const TTL_MS: Record<TokenPurpose, number> = {
  verify: 7 * 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

/**
 * Issue a token and return the raw value for the e-mail.
 *
 * Any earlier unused token of the same purpose is burned first: asking for a
 * second reset link must invalidate the first, otherwise an old message
 * forwarded or left in a shared inbox stays live.
 */
export async function issueAccountToken(
  supabase: SupabaseClient,
  accountId: string,
  purpose: TokenPurpose,
  ip?: string | null
): Promise<string> {
  const now = new Date();

  await supabase
    .from("account_tokens")
    .update({ used_at: now.toISOString() })
    .eq("account_id", accountId)
    .eq("purpose", purpose)
    .is("used_at", null);

  const { token, tokenHash } = createResetToken();
  const { error } = await supabase.from("account_tokens").insert({
    account_id: accountId,
    token_hash: tokenHash,
    purpose,
    expires_at: new Date(now.getTime() + TTL_MS[purpose]).toISOString(),
    requested_ip: ip ?? null,
  });
  if (error) throw error;

  return token;
}

/**
 * Spend a token. Returns the account id, or null for anything that is not a
 * live token of this exact purpose: unknown, expired, already used, or issued
 * for something else.
 *
 * The update is conditioned on `used_at is null`, so two clicks on the same
 * link race at the database and only one wins.
 */
export async function consumeAccountToken(
  supabase: SupabaseClient,
  token: string,
  purpose: TokenPurpose
): Promise<string | null> {
  if (!token) return null;

  const { data } = await supabase
    .from("account_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashResetToken(token))
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("account_id")
    .maybeSingle();

  return (data?.account_id as string | undefined) ?? null;
}
