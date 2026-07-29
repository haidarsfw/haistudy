// ============================================
// What an account can actually open
// ============================================
//
// An account is an identity. An "access" is one purchased exam period hanging
// off it — internally still a `license_keys` row, which is why nothing in the
// app below this layer had to change.
//
// One account can hold several: s2 UAS bought in July, s3 UTS bought in
// October. That is the whole reason this layer exists.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAccountReferralCode,
  listAccountReferralCodes,
  mintAccountReferralCode,
} from "@/lib/referral/codes";
import { getReferralProgress, type ReferralProgress } from "@/lib/referral/rewards";
import { DEFAULT_SCOPE, scopeKey as toScopeKey, validateScopeTuple } from "@/lib/scope";
import type { ExamPeriod, ScopeTuple } from "@/types/scope";

export type AccessStatus = "active" | "expired" | "suspended";

export interface AccountAccess {
  licenseKey: string;
  scope: ScopeTuple;
  scopeKey: string;
  packageTier: "share" | "normal" | "vip" | "diamond";
  maxDevices: number;
  unlimitedDevices: boolean;
  isAdmin: boolean;
  /** null when never opened — the clock starts at first sign-in, not at purchase. */
  expiry: string | null;
  activated: boolean;
  status: AccessStatus;
  /** Whole days remaining, rounded up. null when there is no expiry yet. */
  daysLeft: number | null;
}

const SELECT =
  "key, package_tier, max_devices, unlimited_devices, is_admin, " +
  "semester, exam_period, jurusan, suspended_until, created_at, " +
  "activations(expiry)";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function mapAccess(row: any): AccountAccess {
  // UNIQUE(license_key) on activations means at most one, but Supabase types
  // the embed as a list.
  const activation = Array.isArray(row.activations) ? row.activations[0] : row.activations;
  const expiry: string | null = activation?.expiry ?? null;

  const tuple: ScopeTuple = {
    semester: typeof row.semester === "number" ? row.semester : DEFAULT_SCOPE.semester,
    examPeriod: (row.exam_period as ExamPeriod) || DEFAULT_SCOPE.examPeriod,
    jurusan: typeof row.jurusan === "string" ? row.jurusan : DEFAULT_SCOPE.jurusan,
  };
  const scope = validateScopeTuple(tuple) ? tuple : DEFAULT_SCOPE;

  const now = Date.now();
  const suspended =
    row.suspended_until && new Date(row.suspended_until).getTime() > now;
  // No activation row yet means nobody has ever opened it. That is a fresh
  // purchase, not an expired one — the 30 days start on first sign-in.
  const expired = expiry ? new Date(expiry).getTime() <= now : false;

  const status: AccessStatus = suspended ? "suspended" : expired ? "expired" : "active";

  return {
    licenseKey: row.key,
    scope,
    scopeKey: toScopeKey(scope),
    packageTier: (row.package_tier as AccountAccess["packageTier"]) || "normal",
    maxDevices: typeof row.max_devices === "number" ? row.max_devices : 2,
    unlimitedDevices: Boolean(row.unlimited_devices),
    isAdmin: Boolean(row.is_admin),
    expiry,
    activated: Boolean(activation),
    status,
    daysLeft: expiry
      ? Math.max(0, Math.ceil((new Date(expiry).getTime() - now) / 86_400_000))
      : null,
  };
}

/** Every access on this account, newest purchase first. */
export async function listAccountAccesses(
  supabase: SupabaseClient,
  accountId: string
): Promise<AccountAccess[]> {
  const { data, error } = await supabase
    .from("license_keys")
    .select(SELECT)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapAccess);
}

export interface AccountPurchase {
  id: string;
  packageId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  approvedAt: string | null;
  /** Invoice number, assigned only on approval. */
  orderNo: number | null;
  amount: number | null;
  scopeKey: string;
}

/** Purchase history for the account, newest first. */
export async function listAccountPurchases(
  supabase: SupabaseClient,
  accountId: string
): Promise<AccountPurchase[]> {
  const { data, error } = await supabase
    .from("purchase_requests")
    .select("id, package, status, created_at, approved_at, meta, semester, exam_period, jurusan")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return data.map((r) => {
    const meta = (r.meta ?? {}) as Record<string, unknown>;
    return {
      id: r.id as string,
      packageId: (r.package as string) ?? "normal",
      status: (r.status as AccountPurchase["status"]) ?? "pending",
      createdAt: r.created_at as string,
      approvedAt: (r.approved_at as string) ?? null,
      orderNo: typeof meta.orderNo === "number" ? meta.orderNo : null,
      amount: typeof meta.uniqueAmount === "number" ? meta.uniqueAmount : null,
      scopeKey: `s${r.semester}-${r.exam_period}-${r.jurusan}`,
    };
  });
}

export interface ReferralInvitee {
  /** Nickname, or a masked address when they have not set one. */
  who: string;
  joinedAt: string;
  /** They bought something and it was approved. */
  credited: boolean;
}

export interface AccountReferral {
  code: string;
  used: number;
  progress: ReferralProgress;
  invitees: ReferralInvitee[];
}

/**
 * The account's referral code.
 *
 * Codes are generated per activation, not per account, so someone who has
 * never opened an access has no code yet. The page says so rather than
 * inventing one — see the referral note in memory for the decisions still
 * outstanding on the crediting side.
 */
export async function getAccountReferral(
  supabase: SupabaseClient,
  accountId: string
): Promise<AccountReferral | null> {
  // Straight off the account. It used to go account → licences → activations,
  // which meant anyone who had not bought anything yet had no code at all —
  // so the one group most likely to share a link with their friends was the
  // one group with nothing to share.
  let code = await getAccountReferralCode(supabase, accountId);

  // Minted on first look for accounts that predate the referral table. Cheap,
  // runs once, and saves a backfill from having to be perfect.
  if (!code) code = await mintAccountReferralCode(supabase, accountId);
  if (!code) return null;

  // Everything derived from the uses table rather than from a stored counter:
  // a number that is computed cannot drift, and the old counter was being
  // incremented on the wrong side of the relationship anyway.
  // Across every code they own, not just the readable one on screen. A retired
  // code still credits them, and a friend who used it last term belongs in
  // this list.
  const allCodes = await listAccountReferralCodes(supabase, accountId);
  const codes = allCodes.length ? allCodes : [code];

  const [progress, { data: rows }] = await Promise.all([
    getReferralProgress(supabase, accountId, code),
    supabase
      .from("referral_uses")
      .select("created_at, credited_at, accounts(nickname, full_name, email)")
      .in("code", codes)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const invitees: ReferralInvitee[] = (rows ?? []).map((r) => {
    const acc = (r as { accounts?: { nickname?: string; full_name?: string; email?: string } | null })
      .accounts;
    return {
      // Their own name if they set one. Otherwise a masked address — the
      // referrer is owed proof their invite landed, not their friend's inbox.
      who: acc?.nickname || acc?.full_name || maskEmail(acc?.email ?? ""),
      joinedAt: r.created_at as string,
      credited: Boolean(r.credited_at),
    };
  });

  return { code, used: invitees.length, progress, invitees };
}

/** "hai***@gmail.com" — enough to recognise, not enough to contact. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Seseorang";
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}${"*".repeat(Math.max(1, local.length - head.length))}@${domain}`;
}

export function activeAccesses(list: AccountAccess[]): AccountAccess[] {
  return list.filter((a) => a.status === "active");
}

/**
 * Where signing in should land someone.
 *
 * Exactly one live access means there is nothing to choose, so choosing for
 * them is not a shortcut, it is the correct answer. Zero or several is a real
 * decision and belongs on the account page.
 */
export function landingPathFor(list: AccountAccess[]): string {
  const live = activeAccesses(list);
  if (live.length === 1) {
    const a = live[0];
    return `/s${a.scope.semester}/${a.scope.examPeriod}/${a.scope.jurusan}/dashboard`;
  }
  return "/account";
}
