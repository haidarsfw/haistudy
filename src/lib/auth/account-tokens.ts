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

export type TokenPurpose = "verify" | "reset" | "delete" | "delete_cancel";

// A verification link should survive a weekend in a crowded inbox. A reset
// link is a live credential, so it gets an hour. So does a deletion request,
// for the same reason.
//
// The cancel link is the exception and gets EIGHT days: the deletion it undoes
// happens on day seven, and a way back that expires before the thing it
// reverses is not a way back.
const TTL_MS: Record<TokenPurpose, number> = {
  verify: 7 * 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
  delete: 60 * 60 * 1000,
  delete_cancel: 8 * 24 * 60 * 60 * 1000,
};

/**
 * Purposes where issuing a new link must kill the old one.
 *
 * `reset` and `delete` are live credentials: an old message forwarded or left
 * in a shared inbox has to stop working the moment a new one is asked for.
 * `delete_cancel` follows the deletion it undoes.
 *
 * `verify` is deliberately NOT in this set. Nothing about it is a credential —
 * spending it only confirms an address the holder already receives mail at —
 * and burning it broke the ordinary funnel: the invoice e-mail mints a verify
 * link of its own, which silently killed the one in the registration e-mail
 * sent minutes earlier. Since only the SHA-256 is stored, the older link cannot
 * be re-sent, so the buyer opening the mail actually titled "Konfirmasi email"
 * was told the link was "sudah kedaluwarsa atau pernah dipakai" when it was
 * neither. Every buyer who registered and then ordered hit this.
 */
const BURN_PREVIOUS: ReadonlySet<TokenPurpose> = new Set<TokenPurpose>([
  "reset",
  "delete",
  "delete_cancel",
]);

/**
 * Issue a token and return the raw value for the e-mail.
 */
export async function issueAccountToken(
  supabase: SupabaseClient,
  accountId: string,
  purpose: TokenPurpose,
  ip?: string | null
): Promise<string> {
  const now = new Date();

  if (BURN_PREVIOUS.has(purpose)) {
    await supabase
      .from("account_tokens")
      .update({ used_at: now.toISOString() })
      .eq("account_id", accountId)
      .eq("purpose", purpose)
      .is("used_at", null);
  }

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
