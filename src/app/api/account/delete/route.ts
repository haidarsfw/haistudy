import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { AccountError } from "@/lib/auth/account";
import { clearAccountCookie, requireAccount } from "@/lib/auth/account-session";
import { activeAccesses, listAccountAccesses } from "@/lib/auth/account-access";

/**
 * The phrase the user has to type out.
 *
 * A second "are you sure" button is something people click through on reflex.
 * Copying a phrase by hand cannot be done by accident, and it forces a pause
 * long enough to read what is about to happen.
 */
export const DELETE_PHRASE = "HAPUS AKUN SAYA";

const CLEARED = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

/**
 * Delete the account. Immediately, and by the account holder alone — no admin
 * in the middle.
 *
 * Two things stop it being a footgun: an account still holding live paid
 * access cannot be deleted at all, and the phrase above has to be typed out.
 *
 * What actually goes: the account row, and with it every session and every
 * pending verification or reset token. What does NOT go: the licence and
 * purchase rows, which are unlinked (`ON DELETE SET NULL`) rather than
 * destroyed. Those are financial records of a real transaction, and since a
 * deletion can only happen once no access is live, nothing usable survives —
 * only the receipt.
 */
export async function POST(req: Request) {
  // scope-exempt: deletes the caller's own account row. Scoped content is
  // reached through licences, which this route does not touch.
  try {
    const account = await requireAccount();

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let confirm = "";
    try {
      const body = (await req.json()) as Record<string, unknown>;
      confirm = String(body.confirm ?? "").trim();
    } catch {
      /* handled by the phrase check */
    }

    if (confirm.toUpperCase() !== DELETE_PHRASE) {
      return NextResponse.json(
        { error: "Frasa konfirmasinya belum cocok", code: "BAD_PHRASE" },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;

    const live = activeAccesses(await listAccountAccesses(supabase, account.id));
    if (live.length > 0) {
      return NextResponse.json(
        {
          error:
            "Akunmu masih punya akses aktif yang sudah dibayar. Hubungi admin dulu supaya aksesnya tidak hilang begitu saja.",
          code: "HAS_ACTIVE_ACCESS",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("accounts").delete().eq("id", account.id);
    if (error) {
      console.error("[account/delete] failed", error);
      return NextResponse.json({ error: "Gagal menghapus akun" }, { status: 500 });
    }

    // The session row is already gone with the account; clearing the cookies
    // stops the browser from carrying a token that now points at nothing.
    const res = NextResponse.json({ ok: true });
    clearAccountCookie(res);
    res.cookies.set("hs-session", "", CLEARED);
    res.cookies.set("hs-scope", "", CLEARED);
    res.cookies.set("hs-admin", "", CLEARED);
    return res;
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/delete] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
