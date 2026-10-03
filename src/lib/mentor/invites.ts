import type { SupabaseClient } from "@supabase/supabase-js";

import { attachReferral, mintAccountReferralCode } from "@/lib/referral/codes";

/**
 * Group invites by e-mail or WhatsApp: entry path #1 and attribution net #3.
 *
 * A mentor pastes the official class list. Whoever on it signs up later lands
 * in the group, and — only when they typed no code and came through no link —
 * is attributed to that mentor. "Jaring 3 membuat mentor praktis tidak bisa
 * kehilangan mentee-nya sendiri."
 */

export type InviteKind = "email" | "whatsapp";
export interface Contact {
  kind: InviteKind;
  value: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * One normal form per person. "0812…", "+62 812…" and "62812…" are the same
 * phone; "Budi@Gmail.com" and "budi@gmail.com" the same inbox. Matching on the
 * raw text would treat each spelling as a stranger.
 */
export function normalizeContact(raw: string): Contact | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.includes("@")) {
    const email = s.toLowerCase();
    return EMAIL_RE.test(email) && email.length <= 120 ? { kind: "email", value: email } : null;
  }
  let digits = s.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  // Indonesian mobile numbers: 62 + 8 + 8 to 11 more digits.
  return /^628\d{7,11}$/.test(digits) ? { kind: "whatsapp", value: digits } : null;
}

/** A pasted list: one contact per line, or separated by commas/semicolons. */
export function parseInviteList(text: string): { valid: Contact[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: Contact[] = [];
  const invalid: string[] = [];
  for (const piece of text.split(/[\n,;]+/)) {
    const raw = piece.trim();
    if (!raw) continue;
    const c = normalizeContact(raw);
    if (!c) {
      invalid.push(raw.slice(0, 60));
      continue;
    }
    const key = `${c.kind}:${c.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(c);
  }
  return { valid, invalid };
}

/** Find an existing account for a contact. WhatsApp is stored as typed, so it is compared after normalising. */
export async function findAccountByContact(
  supabase: SupabaseClient,
  c: Contact
): Promise<string | null> {
  if (c.kind === "email") {
    const { data } = await supabase
      .from("accounts")
      .select("id")
      .eq("email_lower", c.value)
      .maybeSingle();
    return (data?.id as string) ?? null;
  }
  const tail = c.value.slice(-9);
  const { data } = await supabase
    .from("accounts")
    .select("id, whatsapp")
    .like("whatsapp", `%${tail}`)
    .limit(5);
  const hit = (data ?? []).find(
    (a) => normalizeContact(String(a.whatsapp ?? ""))?.value === c.value
  );
  return (hit?.id as string) ?? null;
}

/** Put an account in a group as 'invited', unless it is already in it in any state. */
export async function markInvited(
  supabase: SupabaseClient,
  groupId: string,
  accountId: string,
  invitedBy: string | null
): Promise<void> {
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("account_id", accountId)
    .maybeSingle();
  if (existing) return;
  await supabase.from("group_members").insert({
    group_id: groupId,
    account_id: accountId,
    role: "member",
    status: "invited",
    invited_by: invitedBy,
  });
}

/**
 * Called right after an account is created (e-mail sign-up or first Google
 * sign-in), AFTER any typed code or link has been attached. Links every open
 * invite for this person's contacts, puts them in those groups as 'invited',
 * and — only if they still have no referrer — attaches the oldest inviting
 * group's owner as one. That ordering is the plan's "kalau 1 & 2 kosong".
 */
export async function applyInvitesForNewAccount(
  supabase: SupabaseClient,
  accountId: string,
  contacts: { email?: string | null; whatsapp?: string | null }
): Promise<void> {
  const wanted: Contact[] = [];
  for (const raw of [contacts.email, contacts.whatsapp]) {
    const c = raw ? normalizeContact(raw) : null;
    if (c) wanted.push(c);
  }
  if (!wanted.length) return;

  const hits: { id: string; group_id: string; invited_by: string | null }[] = [];
  for (const c of wanted) {
    const { data } = await supabase
      .from("group_invites")
      .select("id, group_id, invited_by, created_at")
      .eq("kind", c.kind)
      .eq("value", c.value)
      .is("account_id", null)
      .order("created_at", { ascending: true });
    for (const r of data ?? []) {
      hits.push({ id: r.id as string, group_id: r.group_id as string, invited_by: (r.invited_by as string) ?? null });
    }
  }
  if (!hits.length) return;

  const now = new Date().toISOString();
  for (const h of hits) {
    await supabase
      .from("group_invites")
      .update({ account_id: accountId, matched_at: now })
      .eq("id", h.id)
      .is("account_id", null);
    await markInvited(supabase, h.group_id, accountId, h.invited_by);
  }

  const { data: use } = await supabase
    .from("referral_uses")
    .select("code")
    .eq("account_id", accountId)
    .maybeSingle();
  if (use) return; // net 1 or 2 already decided it

  const { data: group } = await supabase
    .from("mentor_groups")
    .select("owner_account_id")
    .eq("id", hits[0].group_id)
    .maybeSingle();
  const ownerId = (group?.owner_account_id as string) ?? null;
  if (!ownerId || ownerId === accountId) return;
  const code = await mintAccountReferralCode(supabase, ownerId).catch(() => null);
  if (code) await attachReferral(supabase, accountId, code);
}
