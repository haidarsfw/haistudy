import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: { N?: number; r?: number; p?: number; maxmem?: number }
) => Promise<Buffer>;

/**
 * Password hashing for the email+password login method.
 *
 * scrypt from node:crypto rather than bcrypt/argon2: those are native modules
 * that have to be compiled for the deploy target, and this needs to run on
 * Vercel without a build step or an extra dependency. scrypt is memory-hard and
 * is what node ships for exactly this.
 *
 * Stored format: `scrypt$N$r$p$<salt-b64>$<hash-b64>`. The parameters travel
 * with the hash so they can be raised later without invalidating old hashes.
 */

// ~64 MB per hash (N * r * 128). Deliberate: it is the cost that makes a stolen
// hash expensive to attack. maxmem must be raised to match or node throws.
const N = 32768;
const R = 8;
const P = 1;
const KEYLEN = 32;
const MAXMEM = 128 * N * R * 2;

export const PASSWORD_MIN_LENGTH = 8;
// Long enough to be a passphrase, bounded so a huge body can't be used to burn
// CPU on the hash.
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

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verify. Returns false for anything malformed rather than
 * throwing, so a corrupt row is a failed login and not a 500.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;

    const n = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
      return false;
    }
    // A hostile row could otherwise name parameters big enough to hang the
    // process on every login attempt.
    if (n > 1 << 20 || r > 32 || p > 16) return false;

    const salt = Buffer.from(parts[4], "base64");
    const expected = Buffer.from(parts[5], "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scrypt(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: 128 * n * r * 2,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * A password-reset token and the value to store for it. The raw token goes in
 * the email and is never persisted; only the digest is, so this table leaking
 * cannot be replayed into an account.
 */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
