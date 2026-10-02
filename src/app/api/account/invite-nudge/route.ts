import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { getReferralProgress, FREE_PERIOD_TARGET } from "@/lib/referral/rewards";
import { getAccountReferralCode } from "@/lib/referral/codes";

/** Jarak minimal antar kemunculan. "Sesekali" perlu angka supaya bisa diperiksa. */
const JEDA_HARI = 14;

/**
 * Ajakan "ajak 5 teman, periode berikutnya gratis".
 *
 * GET  — layak muncul sekarang atau tidak, beserta progresnya
 * POST — jawabannya: "nanti" (geser 14 hari) atau "jangan tampilkan lagi"
 *
 * Keduanya menulis ke `accounts`, bukan `user_settings`. Lihat migrasi 078:
 * setelan di-key oleh lisensi, dan lisensi adalah satu periode ujian, jadi
 * jawaban "jangan tampilkan lagi" akan hilang begitu orangnya membeli periode
 * berikutnya.
 *
 * scope-exempt: ajakan ini milik orangnya, bukan periode tertentu. Identitas
 * dari cookie akun, dan semua yang dibaca maupun ditulis terikat ke akun itu.
 */
export async function GET() {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) return NextResponse.json({ eligible: false });

    const supabase = createServerClient()!;
    const { data: row } = await supabase
      .from("accounts")
      .select("invite_nudge_dismissed_at, invite_nudge_shown_at")
      .eq("id", account.id)
      .maybeSingle();

    if (row?.invite_nudge_dismissed_at) {
      return NextResponse.json({ eligible: false, reason: "dismissed" });
    }
    if (row?.invite_nudge_shown_at) {
      const lalu = Date.now() - new Date(row.invite_nudge_shown_at as string).getTime();
      if (lalu < JEDA_HARI * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ eligible: false, reason: "recent" });
      }
    }

    // Hanya untuk yang sudah membeli. Mengajak orang mengajak teman sebelum dia
    // sendiri membeli adalah meminta tolong sebelum memberi apa pun.
    const { count: approved } = await supabase
      .from("purchase_requests")
      .select("id", { head: true, count: "exact" })
      .eq("account_id", account.id)
      .eq("status", "approved");
    if (!approved) return NextResponse.json({ eligible: false, reason: "belum-beli" });

    // Partners are paid in cash, not balance, and have their own page that says
    // exactly how. Telling one "tiap teman menambah saldo Rp5.000" would be a
    // false sentence about their own money. Paused partners included: they are
    // still on the cash side of the line, just not earning this month.
    const { data: partner } = await supabase
      .from("partners")
      .select("status")
      .eq("account_id", account.id)
      .maybeSingle();
    if (partner && (partner.status === "active" || partner.status === "paused")) {
      return NextResponse.json({ eligible: false, reason: "partner" });
    }

    const code = await getAccountReferralCode(supabase, account.id);
    if (!code) return NextResponse.json({ eligible: false, reason: "no-code" });

    const progress = await getReferralProgress(supabase, account.id, code);
    // Yang sudah mencapai targetnya tidak perlu diajak mengejarnya.
    if (progress.toFree <= 0) {
      return NextResponse.json({ eligible: false, reason: "sudah-tercapai" });
    }

    return NextResponse.json({
      eligible: true,
      code,
      credited: progress.credited,
      target: FREE_PERIOD_TARGET,
      toFree: progress.toFree,
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal memeriksa ajakan:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) return NextResponse.json({ ok: true });

    const body = (await req.json().catch(() => ({}))) as { forever?: boolean };
    const now = new Date().toISOString();

    const supabase = createServerClient()!;
    const { error } = await supabase
      .from("accounts")
      .update(
        body.forever
          ? { invite_nudge_dismissed_at: now, invite_nudge_shown_at: now }
          : { invite_nudge_shown_at: now }
      )
      .eq("id", account.id);

    if (error) {
      console.error("Gagal menyimpan jawaban ajakan:", error.message);
      return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, forever: Boolean(body.forever) });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal menyimpan jawaban ajakan:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
