import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { ACCOUNT_COLUMNS, AccountError, mapAccount } from "@/lib/auth/account";
import { requireAccount } from "@/lib/auth/account-session";

/** Trim, cap, and treat an all-whitespace value as empty. */
function field(v: unknown, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

/**
 * Update data diri.
 *
 * These are the fields checkout prefills, which is the whole reason the
 * account layer exists: fill them once here and never type them again.
 *
 * `classCode` is deliberately NOT editable from this route. The class changes
 * every semester, so it belongs to a purchase rather than to a person, and
 * /payments owns it. Two places able to write it is two places that can
 * disagree.
 */
export async function PATCH(req: Request) {
  // scope-exempt: writes only the caller's own row in the account layer, which
  // has no scope columns.
  try {
    const account = await requireAccount();

    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Server belum siap" }, { status: 503 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    const errors: Record<string, string> = {};

    if ("fullName" in body) {
      const v = field(body.fullName, 100);
      if (!v) errors.fullName = "Nama wajib diisi";
      else patch.full_name = v;
    }
    if ("nickname" in body) {
      const v = field(body.nickname, 24);
      if (!v) errors.nickname = "Panggilan wajib diisi";
      else patch.nickname = v;
    }
    if ("whatsapp" in body) {
      const v = field(body.whatsapp, 30);
      // Same floor the purchase form uses: the last three digits become the
      // unique transfer amount, so a stub number breaks payment matching.
      if (v.replace(/\D/g, "").length < 8) errors.whatsapp = "Nomor WhatsApp belum benar";
      else patch.whatsapp = v;
    }
    if ("campus" in body) patch.campus = field(body.campus, 60);
    if ("angkatan" in body) patch.angkatan = field(body.angkatan, 16).toUpperCase();
    if ("avatarUrl" in body) {
      const v = field(body.avatarUrl, 500);
      // Only an https URL, so a stored value can never come back as a
      // javascript: or data: payload once it is rendered as an avatar.
      patch.avatar_url = v && /^https:\/\//i.test(v) ? v : null;
    }
    if ("language" in body) {
      const v = field(body.language, 4);
      if (v === "id" || v === "en") patch.language = v;
    }

    if (Object.keys(errors).length) {
      return NextResponse.json({ error: "Ada yang belum benar", fields: errors }, { status: 400 });
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: true, account: null });
    }

    patch.updated_at = new Date().toISOString();

    const supabase = createServerClient()!;
    const { data, error } = await supabase
      .from("accounts")
      .update(patch)
      .eq("id", account.id)
      .select(ACCOUNT_COLUMNS)
      .single();

    if (error) {
      console.error("[account/profile] update failed", error);
      return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, account: mapAccount(data) });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[account/profile] error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
