// ============================================
// Which browser is this? One answer, one cookie.
// ============================================
//
// A durable RANDOM id per browser. Not a fingerprint — see the note in
// /api/account/enter for why: a campus is full of identical iPhones, so two
// people would collapse into one slot and share a licence for free. A random
// value cannot collide, which is what makes the device limit count devices.
//
// This module exists because there used to be THREE answers to "which browser
// is this", and they disagreed:
//
//   hs-device      set by /api/account/enter, read by /enter        365 days
//   hs-device-id   set by /auth/callback (Google login)              30 days
//   localStorage   src/lib/auth/device.ts, sent by the legacy key form
//
// The device row is keyed on whatever value opened the access, so one browser
// could hold two rows and eat two of a paid licence's slots without its owner
// doing anything wrong: sign in with Google (row keyed on hs-device-id), later
// open the access from the account page (which looks for hs-device, finds
// nothing, calls the browser new, and registers a second row).
//
// The 30-day expiry made it worse than a one-off. A Google user's marker died
// every month, so the next sign-in minted a fresh id and took another slot —
// silently, on a schedule.
//
// So: ONE canonical cookie, and a read that still recognises the old name so no
// existing browser is treated as new. Writing the canonical cookie on every
// path means a browser converges the first time it is seen again.

/** The one cookie that answers the question. */
export const DEVICE_COOKIE = "hs-device";

/**
 * The old name, still read so browsers that only carry it keep their existing
 * device row instead of being handed a second one. Never written any more; it
 * expires on its own.
 */
export const LEGACY_DEVICE_COOKIE = "hs-device-id";

/**
 * A year. Long on purpose: this marker expiring is not a security event, it is
 * a device slot quietly disappearing and being re-taken by the same browser.
 */
export const DEVICE_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
};

/** Reads a cookie by name. Satisfied by both `cookies()` and `req.cookies`. */
export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export interface DeviceIdentity {
  /** The id to use. Empty only when this browser has never been seen. */
  id: string;
  /**
   * True when the id came from the old cookie, or from nowhere. Either way the
   * canonical cookie has to be written so the next visit is unambiguous.
   */
  needsCookie: boolean;
}

/**
 * The id this browser should be known by.
 *
 * Canonical name first, old name second. Falling back rather than minting a new
 * id is the whole point: the fallback value is the one the existing device row
 * is keyed on, so the browser is recognised instead of counted twice.
 */
export function readDeviceIdentity(jar: CookieReader): DeviceIdentity {
  const current = jar.get(DEVICE_COOKIE)?.value?.trim();
  if (current) return { id: current, needsCookie: false };

  const legacy = jar.get(LEGACY_DEVICE_COOKIE)?.value?.trim();
  if (legacy) return { id: legacy, needsCookie: true };

  return { id: "", needsCookie: true };
}

/** Same, from a raw Cookie header, for handlers that do not have a jar. */
export function readDeviceIdentityFromHeader(header: string | null): DeviceIdentity {
  const parts = (header || "").split(";").map((p) => p.trim());
  const pick = (name: string) => {
    const hit = parts.find((p) => p.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)).trim() : "";
  };
  const current = pick(DEVICE_COOKIE);
  if (current) return { id: current, needsCookie: false };
  const legacy = pick(LEGACY_DEVICE_COOKIE);
  if (legacy) return { id: legacy, needsCookie: true };
  return { id: "", needsCookie: true };
}

/** A fresh id for a browser that has never been seen. */
export function newDeviceId(): string {
  return crypto.randomUUID();
}

/**
 * Desktop / mobile / tablet from the user agent, for the label shown on the
 * devices list. Was written three times with two different opinions about
 * iPads; a tablet is a tablet.
 */
export function detectDeviceType(ua: string): "mobile" | "desktop" | "tablet" {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  return /mobile|android|iphone|ipod/i.test(ua) ? "mobile" : "desktop";
}
