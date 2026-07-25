import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { findAccountById } from "@/lib/auth/account";
import {
  applyAccountCookie,
  createAccountSession,
  revokeAllAccountSessions,
} from "@/lib/auth/account-session";
import { consumeAccountToken } from "@/lib/auth/account-tokens";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { checkServerRateLimit } from "@/lib/auth/server-rate-limit";
import { getClientIp } from "@/lib/auth/oauth-cookie-helpers";

/**
 * Spend a reset token and set a new password.
 *
 * Every other session is revoked afterwards. A reset is the move someone makes
 * when they think a stranger has their account, so it has to end whatever that
 * stranger is holding. The device doing the reset is signed straight back in,
 * so the person who asked for it does not have to type the new password twice.
 */
export async function POST(req: Request) {
  // scope-exempt: account layer only.
  const ip = getClientIp(req);

  const gate = await checkServerRateLimit(ip);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "").slice(0, 400);

  const pwProblem = validatePassword(password);
  if (pwProblem) {
    return NextResponse.json({ error: pwProblem, field: "password" }, { status: 400 });
  }
  if (!token) {
    return NextResponse.json({ error: "Tautan tidak valid", code: "BAD_TOKEN" }, { status: 400 });
  }

  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
  }
  const supabase = createServerClient()!;

  const accountId = await consumeAccountToken(supabase, token, "reset");
  if (!accountId) {
    return NextResponse.json(
      {
        error: "Tautannya sudah kedaluwarsa atau pernah dipakai. Minta tautan baru.",
        code: "BAD_TOKEN",
      },
      { status: 400 }
    );
  }

  const account = await findAccountById(supabase, accountId);
  if (!account || account.authProvider !== "password" || account.status === "blocked") {
    return NextResponse.json({ error: "Tautan tidak valid", code: "BAD_TOKEN" }, { status: 400 });
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      password_hash: await hashPassword(password),
      updated_at: new Date().toISOString(),
      // Anyone who can spend a reset token owns the mailbox, so treat the
      // address as proven.
      email_verified_at: account.emailVerifiedAt ?? new Date().toISOString(),
    })
    .eq("id", account.id);

  if (error) {
    console.error("[account/password/reset] update failed", error);
    return NextResponse.json({ error: "Gagal menyimpan password baru" }, { status: 500 });
  }

  await revokeAllAccountSessions(supabase, account.id);

  const sessionToken = await createAccountSession(supabase, account.id, req);
  const res = NextResponse.json({ ok: true, email: account.email });
  return applyAccountCookie(res, sessionToken);
}
