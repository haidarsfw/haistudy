// ============================================
// account sessions — the hs-account cookie
// ============================================
//
// Deliberately an opaque random token in a table, not a signed JWT.
//
// The reason is revocation. "Sign out from every device" and per-device
// sign-out both have to take effect immediately, and a self-contained token
// cannot be taken back once issued. The price is one indexed read per
// account request, and account requests are rare: the profile page and
// checkout, never the app's hot path.
//
// Only the SHA-256 of the token is stored, so a database dump does not hand
// anyone a working session.

import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import {
  ACCOUNT_COLUMNS,
  Account,
  AccountError,
  mapAccount,
} from "@/lib/auth/account";

export const ACCOUNT_COOKIE = "hs-account";

const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// One write per hour per session at most. Without this every page view would
// be a database write purely to move a timestamp.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface AccountSessionContext {
  account: Account;
  sessionId: string;
}

/**
 * Mint a session and return the raw token. The caller is responsible for
 * putting it in the cookie — this function never touches the response, so it
 * works the same from a JSON handler and from a redirect.
 */
export async function createAccountSession(
  supabase: SupabaseClient,
  accountId: string,
  request?: Request
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS).toISOString();

  const { error } = await supabase.from("account_sessions").insert({
    account_id: accountId,
    token_hash: hashToken(token),
    user_agent: request?.headers.get("user-agent")?.slice(0, 300) ?? null,
    ip: readIp(request),
    expires_at: expiresAt,
  });
  if (error) throw error;

  return token;
}

function readIp(request?: Request): string | null {
  if (!request) return null;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

/**
 * Resolve the cookie into an account, or null. One query: the session row and
 * its account come back together.
 *
 * Returns null rather than throwing for every failure mode — expired, revoked,
 * deleted, blocked — because to a signed-out visitor they are all the same
 * thing, and distinguishing them would leak whether a token was ever real.
 */
export async function readAccountSession(): Promise<AccountSessionContext | null> {
  if (!isSupabaseServerConfigured) return null;

  const jar = await cookies();
  const token = jar.get(ACCOUNT_COOKIE)?.value;
  if (!token) return null;

  const supabase = createServerClient()!;
  const { data } = await supabase
    .from("account_sessions")
    .select(`id, expires_at, revoked_at, last_seen_at, accounts!inner(${ACCOUNT_COLUMNS})`)
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  // Supabase types a to-one embed as an array in some versions; normalise.
  const raw = Array.isArray(data.accounts) ? data.accounts[0] : data.accounts;
  if (!raw) return null;

  const account = mapAccount(raw);
  if (account.status === "blocked") return null;

  void slideExpiry(supabase, data.id, data.last_seen_at);

  return { account, sessionId: data.id };
}

/**
 * Push last_seen_at and the expiry forward, at most once an hour. Fire and
 * forget: a failed heartbeat must never fail the request that triggered it.
 */
async function slideExpiry(
  supabase: SupabaseClient,
  sessionId: string,
  lastSeenAt: string | null
): Promise<void> {
  const last = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  if (Date.now() - last < TOUCH_INTERVAL_MS) return;
  try {
    const now = new Date();
    await supabase
      .from("account_sessions")
      .update({
        last_seen_at: now.toISOString(),
        expires_at: new Date(now.getTime() + SESSION_MS).toISOString(),
      })
      .eq("id", sessionId);
  } catch {
    /* non-critical */
  }
}

/** The account behind this request, or null when signed out. */
export async function getOptionalAccount(): Promise<Account | null> {
  const ctx = await readAccountSession();
  return ctx?.account ?? null;
}

/**
 * The account behind this request. Throws AccountError(401) when signed out.
 * The account-layer counterpart to requireScope.
 */
export async function requireAccount(): Promise<Account> {
  const ctx = await readAccountSession();
  if (!ctx) {
    throw new AccountError("Kamu belum masuk", 401, "NO_ACCOUNT");
  }
  return ctx.account;
}

/** Same, but also hands back which session is being used. */
export async function requireAccountSession(): Promise<AccountSessionContext> {
  const ctx = await readAccountSession();
  if (!ctx) {
    throw new AccountError("Kamu belum masuk", 401, "NO_ACCOUNT");
  }
  return ctx;
}

export async function revokeCurrentAccountSession(
  supabase: SupabaseClient
): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ACCOUNT_COOKIE)?.value;
  if (!token) return;
  await supabase
    .from("account_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token));
}

/**
 * Sign out everywhere. `exceptSessionId` keeps the current device signed in,
 * which is what "log out my other devices" means to a user who is looking at
 * the button they just pressed.
 */
export async function revokeAllAccountSessions(
  supabase: SupabaseClient,
  accountId: string,
  exceptSessionId?: string
): Promise<void> {
  let q = supabase
    .from("account_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("account_id", accountId)
    .is("revoked_at", null);
  if (exceptSessionId) q = q.neq("id", exceptSessionId);
  await q;
}

export function applyAccountCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(ACCOUNT_COOKIE, token, COOKIE_OPTS);
  return response;
}

export function clearAccountCookie(response: NextResponse): NextResponse {
  response.cookies.set(ACCOUNT_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return response;
}
