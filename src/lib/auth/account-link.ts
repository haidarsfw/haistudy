import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which account owns a licence?
 *
 * Stage 2 of the identity migration: rows that used to record only the licence
 * that created them now record the account as well, so a person's own history
 * survives the licence expiring under them.
 *
 * ─── Resolved from the LICENCE, never from the caller's account cookie ───
 *
 * This is the one rule here that matters. Reading `hs-account` would be free,
 * and it would be wrong: the two cookies are independent, so someone holding
 * account A's session and licence B would stamp A's id onto B's rows. Account
 * sharing is possible by design in this product, which makes that not a
 * hypothetical. The licence is the only thing the request has actually proven,
 * so the licence is what we ask.
 *
 * ─── Why a cache ───
 *
 * `license_keys.key` is the primary key, so the lookup is one index hit — but
 * some of these write paths are hot (a chat message per keystroke-burst, a
 * presence upsert per minute), and the free-tier database has already been
 * knocked over once by write volume. A module-level map makes it one lookup per
 * licence per instance instead of one per insert. Fluid Compute reuses
 * instances, so in practice this is warm.
 *
 * A stale entry can only ever cost a null: a licence attached to an account in
 * the last few minutes writes account_id null until the entry expires. Nothing
 * reads this column yet, and the backfill in migrations 066/067 is idempotent,
 * so a null written today is repairable and harmless. The approval route calls
 * `forgetLicenseAccount` anyway, which is where an attachment actually happens.
 */

const TTL_MS = 10 * 60 * 1000;
/** 237 licences exist in total, so this is a guard against a bug, not growth. */
const MAX_ENTRIES = 2000;

const cache = new Map<string, { accountId: string | null; at: number }>();

export async function accountIdForLicense(
  supabase: SupabaseClient,
  licenseKey: string | null | undefined
): Promise<string | null> {
  const key = String(licenseKey ?? "").trim().toUpperCase();
  if (!key) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.accountId;

  const { data, error } = await supabase
    .from("license_keys")
    .select("account_id")
    .eq("key", key)
    .maybeSingle();

  // Fails soft, deliberately. This is a denormalised extra column on a write
  // that already succeeds without it — refusing the whole insert because the
  // ownership lookup hiccupped would turn a cosmetic gap into lost data.
  if (error) return null;

  const accountId = (data?.account_id as string | null) ?? null;
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(key, { accountId, at: Date.now() });
  return accountId;
}

/**
 * Forget one licence, so the next write re-reads its owner.
 *
 * Called wherever a licence becomes attached to an account — approving a
 * purchase, an admin editing a licence. Without it, the rows written in the
 * first minutes of somebody's access would be the only ones missing an owner.
 */
export function forgetLicenseAccount(licenseKey: string | null | undefined): void {
  const key = String(licenseKey ?? "").trim().toUpperCase();
  if (key) cache.delete(key);
}

/**
 * "Belongs to this person" as a PostgREST filter — the licence OR the account.
 *
 * Stage 3 of the identity migration, in the only shape that cannot break
 * anything. Replacing `license_key = X` with `account_id = A` would be a swap
 * and swaps can lose rows; this is a WIDENING. It matches everything it matched
 * before, plus rows the same person made under a licence they no longer hold.
 * There is no cardinality trap either, because it is used on list reads and on
 * ownership guards, never on a lookup that expects exactly one row.
 *
 *   const owner = ownerFilter(licenseKey, accountId);
 *   supabase.from("snippet_library").select("*").or(owner)
 *
 * Falls back to the licence alone when there is no account, which is the correct
 * answer for the 205 licence holders who predate the account layer.
 *
 * ⚠️ NEVER widen a filter that enforces a LIMIT. Applying this to the exam quota
 * count, for instance, would fold last period's attempts into this period's
 * allowance and quietly take away something the person paid for. Widening is
 * only safe where finding more rows is a gift, not a cost.
 */
export function ownerFilter(
  licenseKey: string | null | undefined,
  accountId: string | null | undefined
): string {
  // Both values come from a validated session — a licence key is
  // [A-Z0-9-] and an account id is a uuid — but this string is spliced into a
  // query language, so it is filtered here rather than trusted upstream.
  const key = String(licenseKey ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  const id = String(accountId ?? "").trim().replace(/[^0-9a-fA-F-]/g, "");
  const parts = [`license_key.eq.${key}`];
  if (id) parts.push(`account_id.eq.${id}`);
  return parts.join(",");
}

/**
 * Owners for many licences at once.
 *
 * For fan-out writes — a notification per member of a cohort — where the licence
 * on each row is the RECIPIENT's, not the caller's. Asking one at a time would
 * be one round trip per recipient on the first run; this is one round trip for
 * the batch, and only for the licences not already cached.
 *
 * Returns a plain map so callers can stamp rows without awaiting inside a loop.
 */
export async function accountIdsForLicenses(
  supabase: SupabaseClient,
  licenseKeys: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const wanted = [...new Set(licenseKeys.map((k) => String(k ?? "").trim().toUpperCase()))].filter(
    Boolean
  );
  const out = new Map<string, string>();
  if (!wanted.length) return out;

  const missing: string[] = [];
  const now = Date.now();
  for (const key of wanted) {
    const hit = cache.get(key);
    if (hit && now - hit.at < TTL_MS) {
      if (hit.accountId) out.set(key, hit.accountId);
    } else {
      missing.push(key);
    }
  }
  if (!missing.length) return out;

  const { data, error } = await supabase
    .from("license_keys")
    .select("key, account_id")
    .in("key", missing);
  if (error) return out; // fails soft, as above

  const seen = new Set<string>();
  for (const row of data ?? []) {
    const key = String(row.key);
    const accountId = (row.account_id as string | null) ?? null;
    seen.add(key);
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(key, { accountId, at: now });
    if (accountId) out.set(key, accountId);
  }
  // Cache the misses too, so a licence that does not exist is not looked up
  // again on every fan-out.
  for (const key of missing) {
    if (!seen.has(key)) cache.set(key, { accountId: null, at: now });
  }
  return out;
}

/**
 * The owner columns to spread into an insert, mirroring `scopeColumns()`.
 *
 *   await supabase.from("chat_messages").insert({
 *     ...payload,
 *     ...scopeColumns(scope),
 *     ...(await accountColumns(supabase, licenseKey)),
 *   });
 *
 * Returns an empty object rather than `{ account_id: null }` when there is no
 * owner, so an insert never overwrites a value that something else has already
 * worked out.
 */
export async function accountColumns(
  supabase: SupabaseClient,
  licenseKey: string | null | undefined
): Promise<{ account_id?: string }> {
  const accountId = await accountIdForLicense(supabase, licenseKey);
  return accountId ? { account_id: accountId } : {};
}
