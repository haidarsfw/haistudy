// ============================================
// May this session read this exam period?
// ============================================
//
// The question `requireScope` never asked. It read `hs-scope` and returned it,
// so the answer to "which period" was whatever the caller typed.
//
// This is the slow, correct answer, used when the cookie carries no valid stamp
// (see scope-cookie.ts). One read, cached per request by Next's own dedupe, and
// only for sessions that predate stamping.

import {
  createServerClient,
  isSupabaseServerConfigured,
} from "@/lib/supabase/server";
import { LATEST_SCOPE, eqScope, isAvailableScope } from "@/lib/scope";
import type { ScopeTuple } from "@/types/scope";

const PREVIEW_KEYS = new Set(["PREVIEW", "PREVIEW01"]);

/**
 * Which periods this licence may read.
 *
 *  - admin           → every period that exists
 *  - preview         → the newest one only, which is the one /preview opens
 *  - a real licence  → the period it was sold for, PLUS every other period the
 *                      same ACCOUNT has bought. One account, several purchases:
 *                      refusing the others would break the whole point of
 *                      separating accounts from access.
 *
 * Unknown key → nothing. A session cookie naming a licence that no longer
 * exists is not a licence.
 */
export async function scopeAllowedFor(
  sessionKey: string,
  scope: ScopeTuple
): Promise<boolean> {
  if (!sessionKey) return false;

  if (PREVIEW_KEYS.has(sessionKey)) {
    return eqScope(scope, LATEST_SCOPE);
  }

  // No database configured (dev/mock): fall back to "any real period", which is
  // what every other guard in this codebase does in that mode.
  if (!isSupabaseServerConfigured) return isAvailableScope(scope);

  const supabase = createServerClient()!;
  const { data: licence } = await supabase
    .from("license_keys")
    .select("key, is_admin, semester, exam_period, jurusan, account_id")
    .eq("key", sessionKey.trim().toUpperCase())
    .maybeSingle();

  if (!licence) return false;
  if (licence.is_admin) return isAvailableScope(scope);

  if (
    licence.semester === scope.semester &&
    licence.exam_period === scope.examPeriod &&
    licence.jurusan === scope.jurusan
  ) {
    return true;
  }

  const accountId = licence.account_id as string | null;
  if (!accountId) return false;

  const { data: siblings } = await supabase
    .from("license_keys")
    .select("semester, exam_period, jurusan")
    .eq("account_id", accountId);

  return (siblings ?? []).some(
    (l) =>
      l.semester === scope.semester &&
      l.exam_period === scope.examPeriod &&
      l.jurusan === scope.jurusan
  );
}
