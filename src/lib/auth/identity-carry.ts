import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Carry a person's own things onto a newly bought licence.
 *
 * Stage 3 of the identity migration, and deliberately NOT the version that was
 * on the table.
 *
 * ─── What the obvious version would have done, and why it is a trap ───
 *
 * "Switch the reads to account_id" sounds like the whole job. `user_settings`
 * and `user_profiles` have license_key as their PRIMARY KEY, so there is exactly
 * one row per licence. Reading those by account instead would work perfectly
 * today, because today no account owns more than one licence — the account layer
 * is weeks old and nobody has bought twice yet.
 *
 * The first person to buy a second period gets two rows, and every
 * `.single()` on that read starts failing. That is the worst shape a bug can
 * take: invisible in every test, triggered by precisely the customer the feature
 * was built for.
 *
 * ─── What this does instead ───
 *
 * When a licence is created for someone who already had one, their settings and
 * profile are COPIED onto the new licence. Reads are untouched, still by
 * license_key, still one row. Nothing can find two of anything.
 *
 * The person's experience is the point and it is unchanged by the choice:
 * buy the next period, and your theme, font, notes, highlights, streak, avatar,
 * bio and class are already there instead of a factory-fresh account.
 *
 * `user_settings` also holds `progress`, `notes` and `highlights`, which is the
 * table behind the "highlights keep disappearing" bug this product has already
 * been burned by once. Restructuring its primary key the week before a manual
 * test pass would put that back in play for a benefit this achieves anyway.
 * When these tables do eventually become one row per account, it will be a
 * migration of its own with the read paths changed deliberately — not a side
 * effect of adding a column.
 *
 * ─── Where it runs ───
 *
 * At approval, when the licence is minted — not at login. The login path is the
 * most sensitive code in the product and does not need to be involved: by the
 * time the buyer first signs in, their rows already exist. `activateLicense`
 * upserts settings with `ignoreDuplicates`, so it will find them and leave them
 * alone.
 *
 * Every failure here is logged and swallowed. A carry-forward that does not
 * happen costs someone their theme; an exception thrown from the approval route
 * costs them the access they paid for.
 */

/** Columns that identify the ROW rather than the person. Never copied. */
const SETTINGS_SKIP = new Set(["license_key", "account_id", "updated_at"]);
const PROFILE_SKIP = new Set(["license_key", "account_id", "updated_at"]);

export async function carryForwardIdentity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  accountId: string | null,
  newLicenseKey: string
): Promise<{ settings: boolean; profile: boolean }> {
  const done = { settings: false, profile: false };
  if (!accountId || !newLicenseKey) return done;

  try {
    // Most recently touched row wins. Someone with several past periods should
    // arrive with the preferences they were last actually using.
    const { data: priorSettings } = await supabase
      .from("user_settings")
      .select("*")
      .eq("account_id", accountId)
      .neq("license_key", newLicenseKey)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (priorSettings) {
      const row: Record<string, unknown> = {
        license_key: newLicenseKey,
        account_id: accountId,
      };
      for (const [k, v] of Object.entries(priorSettings)) {
        if (!SETTINGS_SKIP.has(k)) row[k] = v;
      }
      // ignoreDuplicates: if a row for this licence somehow exists already, it
      // is newer than this copy and must win. Re-approving a purchase must not
      // roll someone's settings back to what they were last period.
      const { error } = await supabase
        .from("user_settings")
        .upsert(row, { onConflict: "license_key", ignoreDuplicates: true });
      if (error) throw error;
      done.settings = true;
    }

    const { data: priorProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("account_id", accountId)
      .neq("license_key", newLicenseKey)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (priorProfile) {
      const row: Record<string, unknown> = {
        license_key: newLicenseKey,
        account_id: accountId,
      };
      for (const [k, v] of Object.entries(priorProfile)) {
        if (!PROFILE_SKIP.has(k)) row[k] = v;
      }
      // `selected_class` is copied along with the rest, then overwritten by the
      // class on the new order if the buyer changed it — the checkout already
      // writes that, and it runs after this.
      const { error } = await supabase
        .from("user_profiles")
        .upsert(row, { onConflict: "license_key", ignoreDuplicates: true });
      if (error) throw error;
      done.profile = true;
    }
  } catch (err) {
    // Never fatal. See the note at the top: the licence matters, the theme does not.
    console.error("[identity-carry] carry-forward failed", err);
  }

  return done;
}
