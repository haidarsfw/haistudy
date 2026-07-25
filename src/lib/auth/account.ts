// ============================================
// accounts — the identity layer
// ============================================
//
// An account is who someone is. A license key is what they bought. Until this
// existed they were the same row, so buying the next exam period meant getting
// a brand new identity and re-typing every detail.
//
// Nothing here grants access to the app. Access is still `hs-session` holding a
// license key, exactly as before; this layer only sits above it.
//
// One rule runs through the whole file: `password_hash` is never selected into
// anything that travels. Every read uses ACCOUNT_COLUMNS, which omits it, and
// the one function that needs it says so in its name.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthProvider = "google" | "password";
export type AccountStatus = "active" | "blocked";

export interface Account {
  id: string;
  email: string;
  emailLower: string;
  authProvider: AuthProvider;
  emailVerifiedAt: string | null;
  fullName: string;
  nickname: string;
  whatsapp: string;
  campus: string;
  /** Cohort, e.g. "B29". Stable across semesters, unlike classCode. */
  angkatan: string;
  /**
   * Last class used at checkout. Kept here only to prefill the next purchase —
   * the class genuinely changes every semester, so /payments owns editing it.
   */
  classCode: string;
  avatarUrl: string | null;
  language: "id" | "en";
  status: AccountStatus;
  deletionRequestedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export class AccountError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "AccountError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Every column except password_hash. Used by every read in the codebase so a
 * hash cannot leak into a response by someone reaching for `select("*")`.
 */
export const ACCOUNT_COLUMNS =
  "id, email, email_lower, auth_provider, email_verified_at, full_name, nickname, " +
  "whatsapp, campus, angkatan, class_code, avatar_url, language, status, " +
  "deletion_requested_at, created_at, last_login_at";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function mapAccount(row: any): Account {
  return {
    id: row.id,
    email: row.email,
    emailLower: row.email_lower,
    authProvider: row.auth_provider,
    emailVerifiedAt: row.email_verified_at ?? null,
    fullName: row.full_name ?? "",
    nickname: row.nickname ?? "",
    whatsapp: row.whatsapp ?? "",
    campus: row.campus ?? "",
    angkatan: row.angkatan ?? "",
    classCode: row.class_code ?? "",
    avatarUrl: row.avatar_url ?? null,
    language: row.language === "en" ? "en" : "id",
    status: row.status === "blocked" ? "blocked" : "active",
    deletionRequestedAt: row.deletion_requested_at ?? null,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at ?? null,
  };
}

// Same shape the payments route already accepts. Deliberately loose: the real
// test of an address is whether the verification mail arrives.
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// Google sign-in only works with a Google-hosted address, so the form says so
// up front rather than bouncing the user off Google's own error page.
export const GMAIL_RE = /@(gmail|googlemail)\.com$/i;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function findAccountByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<Account | null> {
  const { data } = await supabase
    .from("accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("email_lower", normalizeEmail(email))
    .maybeSingle();
  return data ? mapAccount(data) : null;
}

export async function findAccountById(
  supabase: SupabaseClient,
  id: string
): Promise<Account | null> {
  const { data } = await supabase
    .from("accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapAccount(data) : null;
}

/**
 * The only place a stored hash is ever read. Returns just the hash, never the
 * account, so a careless caller cannot accidentally serialise it.
 */
export async function readPasswordHashForLogin(
  supabase: SupabaseClient,
  accountId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("accounts")
    .select("password_hash")
    .eq("id", accountId)
    .maybeSingle();
  return (data?.password_hash as string | undefined) ?? null;
}

export interface CreateAccountInput {
  email: string;
  authProvider: AuthProvider;
  /** Already hashed. Plain text must never reach this function. */
  passwordHash?: string | null;
  emailVerified?: boolean;
  fullName?: string;
  nickname?: string;
  whatsapp?: string;
  /**
   * Referral code typed at registration. Parked on the account because the
   * referrer is credited when a licence activates, which happens much later.
   */
  referralCode?: string;
}

/**
 * Returns null when the address is already taken — the unique index on
 * email_lower is the arbiter, not a prior SELECT, so two simultaneous
 * registrations cannot both win.
 */
export async function createAccount(
  supabase: SupabaseClient,
  input: CreateAccountInput
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .insert({
      email: input.email.trim(),
      auth_provider: input.authProvider,
      password_hash: input.authProvider === "password" ? input.passwordHash : null,
      email_verified_at: input.emailVerified ? new Date().toISOString() : null,
      full_name: (input.fullName ?? "").trim().slice(0, 100),
      nickname: (input.nickname ?? "").trim().slice(0, 24),
      whatsapp: (input.whatsapp ?? "").trim().slice(0, 30),
      referred_by_code:
        input.referralCode?.trim().toUpperCase().slice(0, 32) || null,
    })
    .select(ACCOUNT_COLUMNS)
    .single();

  // 23505 = unique violation on email_lower.
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data ? mapAccount(data) : null;
}

export async function touchLastLogin(
  supabase: SupabaseClient,
  accountId: string
): Promise<void> {
  await supabase
    .from("accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", accountId);
}

/**
 * Human-readable reason an account cannot sign in with the method it just
 * tried. Returns null when the method is right.
 *
 * Split out because "login gagal" is exactly the message that makes someone
 * think their account vanished. They picked one method at registration and
 * that never changes, so the copy names the method they actually have.
 */
export function wrongMethodMessage(
  account: Account,
  attempted: AuthProvider
): string | null {
  if (account.authProvider === attempted) return null;
  return account.authProvider === "google"
    ? "Akun ini dibuat dengan Google. Masuk pakai tombol Lanjut dengan Google."
    : "Akun ini dibuat dengan email dan password. Masuk pakai email dan passwordmu.";
}
