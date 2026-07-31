// ============================================
// hs-scope — a stamped cookie, not a trusted one
// ============================================
//
// `hs-scope` decides which exam period every scoped API answers for. It used to
// be believed on sight: requireScope read it, parsed it, and returned it. The
// comment above requireScope called itself "the ONLY guard preventing
// cross-scope leak", which was the problem — it answered *which period did you
// ask for*, never *may you have it*.
//
// httpOnly does not help here. It stops page scripts from touching the cookie;
// it does nothing about the person, who can send any cookie value they like
// from devtools, curl, or a proxy. Proven: a licence bound to s1-uts-bm, with
// `hs-scope` typed as `s2-uas-bm`, was served that period's chat, announcements,
// exam quota and settings.
//
// So the cookie now carries a stamp: `<scope-key>~<hmac>`, bound to the session
// it was issued for. Editing the value breaks the stamp. Copying a stamp from
// one session to another breaks it too, because the session key is inside the
// message.
//
// The stamp is a FAST PATH, not the rule. An unstamped cookie — anything issued
// before this shipped — is not rejected; it falls through to a real entitlement
// lookup in the database. That keeps every signed-in user signed in, and costs
// one read only until their next sign-in re-issues a stamped cookie. Verifying a
// stamp costs nothing, which matters: chat and presence call these routes
// constantly and this runs on a free tier.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.SUPABASE_JWT_SECRET || "";
const SEP = "~";

/**
 * Purpose separation. The same secret mints realtime JWTs, and a value valid
 * for one must never be valid for the other.
 */
function stamp(scopeKey: string, sessionKey: string): string {
  return createHmac("sha256", SECRET)
    .update(`hs-scope|v1|${sessionKey}|${scopeKey}`)
    .digest("base64url")
    .slice(0, 27);
}

/**
 * The value to write into the cookie.
 *
 * With no secret configured this returns the bare scope key. That is the same
 * cookie the app has always written, so a missing env var degrades to the old
 * behaviour rather than locking everyone out — and the entitlement lookup still
 * stands behind it.
 */
export function signScopeValue(scopeKey: string, sessionKey: string): string {
  if (!SECRET || !sessionKey) return scopeKey;
  return `${scopeKey}${SEP}${stamp(scopeKey, sessionKey)}`;
}

/**
 * The scope key without its stamp.
 *
 * Every reader of the raw cookie has to go through this, or `parseScopeKey`
 * will choke on the signature and quietly behave as though no scope were set.
 */
export function scopeKeyFromCookie(raw: string | undefined | null): string {
  if (!raw) return "";
  const i = raw.indexOf(SEP);
  return i === -1 ? raw : raw.slice(0, i);
}

/** Does this cookie carry a stamp this server issued for this session? */
export function isScopeStamped(
  raw: string | undefined | null,
  sessionKey: string
): boolean {
  if (!raw || !SECRET || !sessionKey) return false;
  const i = raw.indexOf(SEP);
  if (i === -1) return false;

  const scopeKey = raw.slice(0, i);
  const given = raw.slice(i + 1);
  const want = stamp(scopeKey, sessionKey);

  // Equal length is a precondition of timingSafeEqual, and an unequal length is
  // already a mismatch.
  if (given.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(want));
}
