import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { findAccountById } from "@/lib/auth/account";
import { consumeAccountToken } from "@/lib/auth/account-tokens";

/**
 * Spend a verification token.
 *
 * Deliberately does NOT require a signed-in session: people open mail on a
 * phone and browse on a laptop, and demanding they sign in first is the step
 * where verification quietly stops happening.
 */
export async function POST(req: Request) {
  // scope-exempt: flips one boolean on the caller's own account row.
  let token = "";
  try {
    const body = (await req.json()) as Record<string, unknown>;
    token = String(body.token ?? "").trim();
  } catch {
    /* falls through to the empty-token check */
  }

  if (!token) {
    return NextResponse.json({ error: "Tautan tidak valid", code: "BAD_TOKEN" }, { status: 400 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
  }

  const supabase = createServerClient()!;
  const accountId = await consumeAccountToken(supabase, token, "verify");

  if (!accountId) {
    return NextResponse.json(
      {
        error: "Tautannya sudah kedaluwarsa atau pernah dipakai.",
        code: "BAD_TOKEN",
      },
      { status: 400 }
    );
  }

  const account = await findAccountById(supabase, accountId);
  if (!account) {
    return NextResponse.json({ error: "Tautan tidak valid", code: "BAD_TOKEN" }, { status: 400 });
  }

  // Re-verifying an already-verified address is a success, not an error: it is
  // what happens when someone clicks the same link twice.
  if (!account.emailVerifiedAt) {
    await supabase
      .from("accounts")
      .update({
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);
  }

  return NextResponse.json({ ok: true, email: account.email });
}
