import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { ScopeTuple } from "@/types/scope";
import { scopeKey } from "@/lib/scope";
import { recordRateEvent } from "@/lib/auth/account-rate-limit";

/**
 * Grup mentoring, sisi server.
 *
 * Satu aturan yang memandu seluruh berkas ini: **mentor bukan admin**. Tidak
 * ada fungsi di sini yang melihat `license_keys.is_admin`, dan tidak ada yang
 * memberi akses ke luar grupnya sendiri. Hak mentor berhenti di anggotanya.
 */

// Alfabet yang sama dengan kunci lisensi: tanpa O/0/I/1/L, karena kode ini akan
// dibacakan keras-keras di depan kelas dan disalin dari papan tulis.
const CODE_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 huruf
const CODE_LENGTH = 6; // 31^6 ≈ 887 juta

/**
 * Rejection sampling, bukan `byte % 31`. Sisa bagi membuat delapan huruf
 * pertama alfabet muncul lebih sering daripada sisanya — kecil, tapi kode
 * undangan adalah hal yang ditebak orang, jadi tidak ada alasan menyetor bias
 * yang bisa dihindari dengan tiga baris.
 */
export function generateGroupCode(): string {
  const limit = 256 - (256 % CODE_ALPHA.length); // 248
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH)) {
      if (byte >= limit) continue;
      out += CODE_ALPHA[byte % CODE_ALPHA.length];
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out;
}

export async function generateUniqueGroupCode(
  supabase: SupabaseClient,
  maxRetries = 8
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const code = generateGroupCode();
    const { count } = await supabase
      .from("mentor_groups")
      .select("id", { head: true, count: "exact" })
      .eq("invite_code", code);
    if (!count) return code;
  }
  throw new Error("Tidak bisa membuat kode grup yang unik");
}

export type GroupStatus = "active" | "archived";
export type MemberRole = "mentor" | "member";
export type MemberStatus = "pending" | "invited" | "active" | "left";

export interface MentorGroup {
  id: string;
  ownerAccountId: string;
  name: string;
  scope: ScopeTuple;
  scopeKey: string;
  inviteCode: string;
  inviteOpen: boolean;
  status: GroupStatus;
  maxMembers: number | null;
  note: string | null;
  createdAt: string;
}

export interface GroupRow {
  id: string;
  owner_account_id: string;
  name: string;
  semester: number;
  exam_period: string;
  jurusan: string;
  invite_code: string;
  invite_open: boolean;
  status: string;
  max_members: number | null;
  note: string | null;
  created_at: string;
}

export function toMentorGroup(row: GroupRow): MentorGroup {
  const scope: ScopeTuple = {
    semester: row.semester,
    examPeriod: row.exam_period as ScopeTuple["examPeriod"],
    jurusan: row.jurusan as ScopeTuple["jurusan"],
  };
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    name: row.name,
    scope,
    scopeKey: scopeKey(scope),
    inviteCode: row.invite_code,
    inviteOpen: row.invite_open,
    status: row.status as GroupStatus,
    maxMembers: row.max_members,
    note: row.note,
    createdAt: row.created_at,
  };
}

export const GROUP_COLUMNS =
  "id, owner_account_id, name, semester, exam_period, jurusan, invite_code, invite_open, status, max_members, note, created_at";

/**
 * Grup yang dia PEGANG, dan grup yang dia IKUTI — dua daftar, bukan satu.
 * Seseorang bisa mentor di satu periode dan mentee di periodenya sendiri, dan
 * aplikasi harus bisa membedakan keduanya tanpa menebak dari perannya.
 */
export async function loadGroupsForAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ mentoring: MentorGroup[]; joined: MentorGroup[] }> {
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, role")
    .eq("account_id", accountId)
    .eq("status", "active");

  const ids = (memberships ?? []).map((m) => m.group_id as string);
  // Kepemilikan dibaca terpisah dari keanggotaan: sebuah grup yang baru dibuat
  // belum tentu sudah punya baris anggota untuk pemiliknya, dan pemilik yang
  // tidak melihat grupnya sendiri adalah kegagalan yang paling membingungkan.
  const { data: owned } = await supabase
    .from("mentor_groups")
    .select(GROUP_COLUMNS)
    .eq("owner_account_id", accountId)
    .eq("status", "active");

  const byId = new Map<string, GroupRow>();
  for (const row of (owned ?? []) as GroupRow[]) byId.set(row.id, row);

  if (ids.length) {
    const { data: joinedRows } = await supabase
      .from("mentor_groups")
      .select(GROUP_COLUMNS)
      .in("id", ids)
      .eq("status", "active");
    for (const row of (joinedRows ?? []) as GroupRow[]) byId.set(row.id, row);
  }

  const mentorIds = new Set<string>(
    (memberships ?? [])
      .filter((m) => m.role === "mentor")
      .map((m) => m.group_id as string)
  );

  const mentoring: MentorGroup[] = [];
  const joined: MentorGroup[] = [];
  for (const row of byId.values()) {
    const g = toMentorGroup(row);
    if (row.owner_account_id === accountId || mentorIds.has(row.id)) mentoring.push(g);
    else joined.push(g);
  }
  return { mentoring, joined };
}

/**
 * Apakah orang ini mentor? Diturunkan, bukan disimpan sebagai flag.
 *
 * Sebuah kolom `is_mentor` akan menjadi sumber kebenaran kedua yang harus
 * dijaga tetap selaras dengan grupnya, dan yang kedua itu selalu yang basi.
 * Memegang grup aktif ADALAH menjadi mentor.
 */
export async function isMentorAccount(
  supabase: SupabaseClient,
  accountId: string
): Promise<boolean> {
  const { count: owns } = await supabase
    .from("mentor_groups")
    .select("id", { head: true, count: "exact" })
    .eq("owner_account_id", accountId)
    .eq("status", "active");
  if (owns) return true;

  // Only a group that is still running. Archiving a group leaves its member
  // rows in place (history), so without the join an archived group's mentors,
  // its owner included, would stay mentors and keep the perks forever.
  const { count: leads } = await supabase
    .from("group_members")
    .select("id, mentor_groups!inner(status)", { head: true, count: "exact" })
    .eq("account_id", accountId)
    .eq("role", "mentor")
    .eq("status", "active")
    .eq("mentor_groups.status", "active");
  return Boolean(leads);
}

/**
 * Jumlah anggota yang BENAR-BENAR di dalam. `left`, `pending` dan `invited`
 * tidak dihitung — batas anggota yang memasukkan undangan yang belum dijawab
 * akan menolak mentee sungguhan demi orang yang tidak pernah datang.
 */
export async function activeMemberCount(
  supabase: SupabaseClient,
  groupId: string
): Promise<number> {
  const { count } = await supabase
    .from("group_members")
    .select("id", { head: true, count: "exact" })
    .eq("group_id", groupId)
    .eq("status", "active");
  return count ?? 0;
}

/**
 * Peran orang ini di grup tersebut, atau null kalau dia bukan siapa-siapa di
 * situ. Dipakai sebagai gerbang di setiap route grup: tanpanya, satu id grup
 * yang ditebak sudah cukup untuk membaca daftar anggota orang lain.
 */
export async function roleInGroup(
  supabase: SupabaseClient,
  groupId: string,
  accountId: string
): Promise<MemberRole | null> {
  const { data: group } = await supabase
    .from("mentor_groups")
    .select("owner_account_id")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return null;
  if (group.owner_account_id === accountId) return "mentor";

  const { data: member } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  return (member?.role as MemberRole) ?? null;
}

// ─── Batas laju masuk grup ───
//
// Per AKUN, bukan per IP: yang menebak di sini sudah masuk, jadi akunnya adalah
// identitas yang paling sulit diganti. Mentee sungguhan memasukkan satu kode,
// mungkin dua setelah salah ketik; sepuluh dalam lima belas menit sudah bukan
// orang yang sedang bergabung ke kelasnya.

const JOIN_MAX = 10;
const JOIN_WINDOW_MS = 15 * 60_000;

export async function checkGroupJoinQuota(
  supabase: SupabaseClient,
  accountId: string
): Promise<{ allowed: boolean; retryAfter: number }> {
  const since = new Date(Date.now() - JOIN_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("account_rate_events")
    .select("created_at")
    .eq("kind", "group_join")
    .eq("subject", `account:${accountId}`)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(JOIN_MAX + 1);

  // Gagal terbuka, sama seperti pembatas lainnya: pembatas yang melempar error
  // menjatuhkan fitur yang dilindunginya.
  if (error || !data || data.length < JOIN_MAX) return { allowed: true, retryAfter: 0 };

  const oldest = new Date(data[data.length - 1].created_at as string).getTime();
  return {
    allowed: false,
    retryAfter: Math.max(30, Math.ceil((oldest + JOIN_WINDOW_MS - Date.now()) / 1000)),
  };
}

export async function recordGroupJoinAttempt(
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  // Lewat penulis bersama, satu-satunya jalan ke tabel ini.
  await recordRateEvent(supabase, "group_join", `account:${accountId}`);
}

/**
 * Is the owner of this licence a mentor? For the mentor perks: Latihan Soal and
 * AI without limits (plan, Perk table).
 *
 * Derived from the groups, like isMentorAccount, never stored: the day a group
 * is archived the perk ends with it, with nothing to remember to switch off.
 * Two indexed lookups; called on exam start, the quota read, the AI
 * conversation calls and the session check.
 */
export async function isMentorLicense(
  supabase: SupabaseClient,
  licenseKey: string
): Promise<boolean> {
  const { data: lic } = await supabase
    .from("license_keys")
    .select("account_id")
    .eq("key", licenseKey)
    .maybeSingle();
  const accountId = (lic?.account_id as string | null) ?? null;
  if (!accountId) return false;
  return isMentorAccount(supabase, accountId);
}

/**
 * Which of these accounts are mentors right now: the batched isMentorAccount,
 * for screens that show many people at once (the chat list, profile cards).
 * Two queries for any number of accounts. Same rule: the group must be active.
 */
export async function mentorAccountsAmong(
  supabase: SupabaseClient,
  accountIds: string[]
): Promise<Set<string>> {
  const ids = [...new Set(accountIds.filter(Boolean))];
  const out = new Set<string>();
  if (!ids.length) return out;
  const [{ data: owners }, { data: leads }] = await Promise.all([
    supabase
      .from("mentor_groups")
      .select("owner_account_id")
      .in("owner_account_id", ids)
      .eq("status", "active"),
    supabase
      .from("group_members")
      .select("account_id, mentor_groups!inner(status)")
      .in("account_id", ids)
      .eq("role", "mentor")
      .eq("status", "active")
      .eq("mentor_groups.status", "active"),
  ]);
  for (const r of owners ?? []) out.add(r.owner_account_id as string);
  for (const r of leads ?? []) out.add(r.account_id as string);
  return out;
}

/**
 * Is this account in any running group, as mentor or member? For "Tanya
 * mentor" in the material: the button only makes sense for someone who has a
 * group to ask. Owners first (a group need not have its owner's member row).
 */
export async function hasActiveGroup(
  supabase: SupabaseClient,
  accountId: string
): Promise<boolean> {
  const { count: owns } = await supabase
    .from("mentor_groups")
    .select("id", { head: true, count: "exact" })
    .eq("owner_account_id", accountId)
    .eq("status", "active");
  if (owns) return true;
  const { count: inside } = await supabase
    .from("group_members")
    .select("id, mentor_groups!inner(status)", { head: true, count: "exact" })
    .eq("account_id", accountId)
    .eq("status", "active")
    .eq("mentor_groups.status", "active");
  return Boolean(inside);
}
