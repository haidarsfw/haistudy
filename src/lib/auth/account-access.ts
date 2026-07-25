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
