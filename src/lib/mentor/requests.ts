import type { SupabaseClient } from "@supabase/supabase-js";

import { getOptionalAccount } from "@/lib/auth/account-session";
import { getCaller } from "@/lib/auth/session-license";
import { accountIdForLicense } from "@/lib/auth/account-link";
import type { GroupRow } from "@/lib/mentor/groups";

/**
 * Join requests: entry path #3, "mentee minta gabung, mentor setujui sekali
 * ketuk". Shared by the request route, the answer route and the popover.
 */

/**
 * Who is asking. The account cookie first; inside the app a session opened
 * through a licence carries the account on the licence row instead.
 */
export async function requestingAccountId(supabase: SupabaseClient): Promise<string | null> {
  const account = await getOptionalAccount();
  if (account) return account.id;
  const caller = await getCaller();
  return caller ? accountIdForLicense(supabase, caller.licenseKey) : null;
}

type LicenceRow = { key: string; semester: number; exam_period: string; jurusan: string };

/**
 * One row per licence the person holds, each in that licence's own period.
 *
 * The inbox is read per licence, the one the session was opened with. A mentor
 * usually holds two (the period they teach and their own) and opens whichever
 * they are studying in; sending to just one meant a request could sit unseen
 * in the other. Capped at five; someone with no licence yet (a mentee who has
 * not bought) has no inbox and sees the answer on the group page instead.
 */
export async function notify(
  supabase: SupabaseClient,
  accountId: string,
  g: Pick<GroupRow, "id" | "name">,
  type: "group_request" | "group_approved" | "session_summary",
  senderName: string | null,
  preview: string
): Promise<void> {
  const { data } = await supabase
    .from("license_keys")
    .select("key, semester, exam_period, jurusan")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = (data ?? []) as LicenceRow[];
  if (!rows.length) return;
  const { error } = await supabase.from("notifications").insert(
    rows.map((lic) => ({
      license_key: lic.key,
      type,
      sender_name: senderName,
      preview,
      context: "system",
      thread_id: g.id,
      thread_title: g.name,
      semester: lic.semester,
      exam_period: lic.exam_period,
      jurusan: lic.jurusan,
    }))
  );
  if (error) console.error("[mentor/requests] notifikasi gagal:", error.message);
}

/** Tell every mentor of the group that someone asked to join. */
export async function notifyMentorsOfRequest(
  supabase: SupabaseClient,
  g: GroupRow,
  requesterName: string
): Promise<void> {
  const { data: co } = await supabase
    .from("group_members")
    .select("account_id")
    .eq("group_id", g.id)
    .eq("role", "mentor")
    .eq("status", "active");
  const ids = new Set<string>([g.owner_account_id, ...(co ?? []).map((r) => r.account_id as string)]);
  for (const id of ids) {
    await notify(supabase, id, g, "group_request", requesterName, `Minta gabung ke ${g.name}`);
  }
}

/** Tell the person who asked that they are in. */
export async function notifyRequestApproved(
  supabase: SupabaseClient,
  accountId: string,
  g: GroupRow
): Promise<void> {
  await notify(supabase, accountId, g, "group_approved", null, `Kamu sekarang anggota ${g.name}`);
}
