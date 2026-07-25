/**
 * Password rules that both sides of the wire need.
 *
 * Split out from `password.ts` on purpose. That file imports `node:crypto` and
 * `node:util` at module scope, so the moment a `"use client"` component pulled
 * a single constant out of it, the browser tried to evaluate the whole thing
 * and blew up on `promisify(scrypt)` — which crashed `/register` and
 * `/reset-password` outright.
 *
 * Nothing in here touches crypto, so it is safe to import from anywhere.
 * Hashing and verifying stay server-side in `password.ts`.
 */

// Long enough to be a passphrase, bounded so a huge body cannot be used to
// burn CPU on the hash.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

/** Why this password is unacceptable, or null if it's fine. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password minimal ${PASSWORD_MIN_LENGTH} karakter`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password maksimal ${PASSWORD_MAX_LENGTH} karakter`;
  }
  return null;
}
