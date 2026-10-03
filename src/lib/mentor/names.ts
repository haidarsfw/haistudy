import type { SupabaseClient } from "@supabase/supabase-js";

import { displayName } from "@/lib/name";

/**
 * The name to show other people for each of these accounts, in one batch.
 *
 * The account's nickname first, then its full name. Many accounts have
 * neither: signup asks only for what Google hands over, and the buyer's real
 * name is collected at checkout onto the LICENCE. Without the licence fallback
 * a mentor read "Pengguna minta gabung" and a member list full of "Tanpa nama".
 * Nickname rule as everywhere else: never the full legal name, only its first
 * word.
 */
export async function displayNamesForAccounts(
  supabase: SupabaseClient,
  accountIds: string[]
): Promise<Map<string, string>> {
  const ids = [...new Set(accountIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, nickname, full_name")
    .in("id", ids);
  const missing: string[] = [];
  for (const a of (accounts ?? []) as { id: string; nickname: string | null; full_name: string | null }[]) {
    if (a.nickname?.trim() || a.full_name?.trim()) {
      out.set(a.id, displayName({ shortName: a.nickname, name: a.full_name }));
    } else {
      missing.push(a.id);
    }
  }

  if (missing.length) {
    const { data: lics } = await supabase
      .from("license_keys")
      .select("account_id, short_name, name, created_at")
      .in("account_id", missing)
      .order("created_at", { ascending: false });
    for (const l of (lics ?? []) as { account_id: string; short_name: string | null; name: string | null }[]) {
      if (out.has(l.account_id)) continue; // newest licence with a name wins
      if (l.short_name?.trim() || l.name?.trim()) {
        out.set(l.account_id, displayName({ shortName: l.short_name, name: l.name }));
      }
    }
  }
  for (const id of ids) if (!out.has(id)) out.set(id, "Pengguna");
  return out;
}
