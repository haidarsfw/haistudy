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

export interface PasswordCheck {
  id: "length" | "upper" | "lower" | "digit" | "symbol";
  label: string;
  ok: boolean;
}

// Anything that is not a letter, a digit, or whitespace. Deliberately broad:
// naming a fixed set of "allowed" symbols is how you end up rejecting the £ a
// student actually typed.
const SYMBOL_RE = /[^A-Za-z0-9\s]/;

/**
 * The live checklist shown under the password field.
 *
 * Returned as data rather than a single pass/fail so the form can show which
 * rule is still missing while the user types. Being told "password tidak
 * memenuhi syarat" only after pressing the button is the version people give
 * up on.
 */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    {
      id: "length",
      label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: "upper", label: "Ada huruf besar (A-Z)", ok: /[A-Z]/.test(password) },
    { id: "lower", label: "Ada huruf kecil (a-z)", ok: /[a-z]/.test(password) },
    { id: "digit", label: "Ada angka (0-9)", ok: /[0-9]/.test(password) },
    { id: "symbol", label: "Ada simbol (!@#$...)", ok: SYMBOL_RE.test(password) },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return (
    password.length <= PASSWORD_MAX_LENGTH &&
    passwordChecks(password).every((c) => c.ok)
  );
}

/**
 * Why this password is unacceptable, or null if it's fine.
 *
 * The server's last word. The form does the same checks live, but nothing
 * stops a request arriving without ever touching the form.
 */
export function validatePassword(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password maksimal ${PASSWORD_MAX_LENGTH} karakter`;
  }
  const failed = passwordChecks(password).filter((c) => !c.ok);
  if (failed.length === 0) return null;
  // The label is used verbatim. Lowercasing the whole sentence to make it read
  // naturally also flattened the hints — "ada huruf besar (A-Z)" came out as
  // "(a-z)", telling the user the exact opposite of what was missing.
  if (failed.length === 1) return `Password belum memenuhi: ${failed[0].label}`;
  return "Password belum memenuhi semua syarat";
}
