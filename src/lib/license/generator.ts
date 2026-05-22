// ============================================
// 5-char license key generator
// ============================================
// Alphabet excludes O/0/I/1/L (visually ambiguous). 31^5 = 28,629,151
// combos. Sufficient for years of operation; brute-force defended by
// per-IP rate limit (see @/lib/auth/server-rate-limit).

import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 chars
const KEY_LENGTH = 5;

export function generateKey(): string {
  const bytes = randomBytes(KEY_LENGTH);
  let out = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    out += ALPHA[bytes[i] % ALPHA.length];
  }
  return out;
}

export async function generateUniqueKey(
  supabase: SupabaseClient,
  maxRetries = 8
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const k = generateKey();
    const { count } = await supabase
      .from("license_keys")
      .select("key", { head: true, count: "exact" })
      .eq("key", k);
    if (!count) return k;
  }
  throw new Error("Could not generate unique key after retries");
}

// Validation helpers — used by /api/auth/validate
const NEW_FORMAT_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
const LEGACY_FORMAT_RE = /^[A-Z0-9-]{6,16}$/; // matches B29-ABC123, HAI-XXXX-XXXX

export function isNewFormatKey(key: string): boolean {
  return NEW_FORMAT_RE.test(key);
}

export function isLegacyFormatKey(key: string): boolean {
  return LEGACY_FORMAT_RE.test(key) && /-/.test(key);
}

export function isMockKey(key: string): boolean {
  return key === "ADMIN1" || key === "PREVIEW01";
}

export function isAcceptableKeyFormat(key: string): boolean {
  return isNewFormatKey(key) || isLegacyFormatKey(key) || isMockKey(key);
}
