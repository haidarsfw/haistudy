import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError, readPasswordHashForLogin } from "@/lib/auth/account";
import {
  applyAccountCookie,
  createAccountSession,
  requireAccount,
  revokeAllAccountSessions,
} from "@/lib/auth/account-session";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth/password";

/**
 * Change the password while signed in.
 *
 * The current password is required even though the session already proves who
 * this is: a session is what an unattended laptop hands to whoever sits down
 * next, and the current password is the one thing that person will not have.
 *
 * Afterwards every other session is revoked and this device is issued a fresh
 * one, so a change made because "someone else is in my account" actually ends
 * that someone else's access.
 */
export async function POST(req: Request) {
  // scope-exempt: account layer only.
  try {
    const account = await requireAccount();

    if (account.authProvider !== "password") {
      return NextResponse.json(
        {
          error: "Akun ini masuk lewat Google, jadi tidak punya password.",
          code: "GOOGLE_ACCOUNT",
        },
        { status: 400 }
      );
    }
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const current = String(body.currentPassword ?? "").slice(0, 400);
    const next = String(body.newPassword ?? "").slice(0, 400);

    const problem = validatePassword(next);
    if (problem) {
      return NextResponse.json({ error: problem, field: "newPassword" }, { status: 400 });
    }
    if (next === current) {
      return NextResponse.json(
        { error: "Password barunya masih sama dengan yang lama", field: "newPassword" },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;
    const hash = await readPasswordHashForLogin(supabase, account.id);
    if (!hash || !(await verifyPassword(current, hash))) {
      return NextResponse.json(
        { error: "Password sekarang salah", field: "currentPassword" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("accounts")
      .update({
        password_hash: await hashPassword(next),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (error) {
      console.error("[account/password] update failed", error);
      return NextResponse.json({ error: "Gagal menyimpan password baru" }, { status: 500 });
    }

    await revokeAllAccountSessions(supabase, account.id);
    const token = await createAccountSession(supabase, account.id, req);

    const res = NextResponse.json({ ok: true });
    return applyAccountCookie(res, token);
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/password] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
