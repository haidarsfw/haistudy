/**
 * How an account is allowed to authenticate.
 *
 * ONE place decides this. The gates used to live inline in each route as
 * "reject if it equals the other method" (/api/auth/validate rejected 'email',
 * /auth/callback rejected 'key'). That shape is only safe while exactly two
 * methods exist: the moment a third appears, every gate silently lets it
 * through, because a 'password' account is neither 'email' nor 'key'. The
 * predicates below are positive instead — a path is allowed only if it is
 * named — so a new method defaults to DENIED everywhere rather than allowed.
 *
 * Values that can appear in license_keys.login_method:
 *   null       legacy — license key AND Google both allowed (pre-038 accounts)
 *   'key'      license key only        (retired next exam period)
 *   'email'    Google only — LEGACY ALIAS of 'google', still on live rows
 *   'google'   Google only
 *   'password' email + password only
 *
 * 'email' is not migrated to 'google' on purpose (see migration 059): renaming
 * live rows before this code shipped would have loosened the binding on the
 * deployed site. Everything here treats the two as the same thing.
 */

/** The methods a user can actually pick. Excludes the legacy alias. */
export type LoginMethod = "key" | "google" | "password";

/** What a purchase form may submit. License key is no longer offered. */
export type PurchaseLoginMethod = "google" | "password";

/** Raw column value, including legacy shapes. */
export type StoredLoginMethod = string | null | undefined;

/**
 * What a stored value actually resolves to.
 *
 * 'legacy' and 'unknown' are separate states on purpose, and collapsing them is
 * a real vulnerability: an earlier cut of this file mapped both to `null` and
 * then read `null` as "legacy, allow key + Google", so ANY unrecognised value
 * in the column — a typo, a half-finished migration, a tampered row — opened
 * BOTH login paths. Unknown must deny; only a genuinely absent value is legacy.
 */
export type ResolvedLoginMethod = LoginMethod | "legacy" | "unknown";

export function resolveLoginMethod(raw: StoredLoginMethod): ResolvedLoginMethod {
  // Only a truly absent value is legacy. An empty string is not absent — it is
  // a value nobody wrote on purpose, so it gets no access.
  if (raw === null || raw === undefined) return "legacy";
  if (raw === "google" || raw === "email") return "google";
  if (raw === "password") return "password";
  if (raw === "key") return "key";
  return "unknown";
}

/** License-key entry. Legacy accounts keep it; nothing else does. */
export function allowsKeyLogin(raw: StoredLoginMethod): boolean {
  const m = resolveLoginMethod(raw);
  return m === "legacy" || m === "key";
}

/** Google sign-in. Legacy accounts keep it. */
export function allowsGoogleLogin(raw: StoredLoginMethod): boolean {
  const m = resolveLoginMethod(raw);
  return m === "legacy" || m === "google";
}

/**
 * Email + password. Never legacy: an account only has a password if one was set
 * for it, so an absent value is a deny here (unlike the two paths above).
 */
export function allowsPasswordLogin(raw: StoredLoginMethod): boolean {
  return resolveLoginMethod(raw) === "password";
}

/**
 * The method to report in a session payload. Legacy and unknown both surface as
 * `null` — callers default that to 'key'. Never gate access on this; use the
 * allows* predicates, which fail closed.
 */
export function normalizeLoginMethod(raw: StoredLoginMethod): LoginMethod | null {
  const m = resolveLoginMethod(raw);
  return m === "legacy" || m === "unknown" ? null : m;
}

/** Where to send someone who turned up on the wrong path. */
export function loginMethodLabel(raw: StoredLoginMethod): string {
  switch (resolveLoginMethod(raw)) {
    case "google":
      return "Google";
    case "password":
      return "email & password";
    case "key":
      return "license key";
    default:
      return "akun";
  }
}
