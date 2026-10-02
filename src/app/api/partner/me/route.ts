import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { partnerSummary, COMMISSION_LADDER } from "@/lib/mentor/commission";
import { listAccountReferralCodes } from "@/lib/referral/codes";

/**
 * Halaman partner, datanya.
 *
 * Satu permintaan mengembalikan semuanya: status pengajuan, ringkasan uang,
 * riwayat komisi, dan kode yang dipakai mengajak orang. Halaman ini dibuka
 * untuk satu pertanyaan — "sudah dapat berapa, dan kapan dibayar" — dan
 * memecahnya jadi empat permintaan hanya membuat empat kesempatan untuk
 * setengah termuat.
 *
 * scope-exempt: komisi tidak terikat periode mana pun. Seorang partner dibayar
 * atas pembelian lintas semester; `requireScope` akan memotong penghasilannya
 * sendiri menjadi sepotong yang kebetulan sedang dia buka. Identitas datang
 * dari cookie akun, dan setiap baris yang dikembalikan sudah terikat ke
 * `partner_id` miliknya.
 */
export async function GET() {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ status: "none", ladder: COMMISSION_LADDER });
    }

    const supabase = createServerClient()!;
    const { data: partner } = await supabase
      .from("partners")
      .select(
        "id, status, pitch, applied_at, decided_at, payout_method, payout_bank, payout_number, payout_name"
      )
      .eq("account_id", account.id)
      .maybeSingle();

    const codes = await listAccountReferralCodes(supabase, account.id);

    // Belum pernah mengajukan. Halamannya tetap dibuka — yang ditampilkan
    // adalah formulirnya, bukan penolakan.
    if (!partner) {
      return NextResponse.json({
        status: "none",
        ladder: COMMISSION_LADDER,
        codes,
      });
    }

    const summary = await partnerSummary(supabase, partner.id as string);

    // Riwayat hanya ditarik untuk partner yang benar-benar punya penghasilan.
    const { data: rows } = summary.sales
      ? await supabase
          .from("partner_commissions")
          .select("nth, rate_percent, base_amount, amount, paid_at, created_at")
          .eq("partner_id", partner.id as string)
          .order("nth", { ascending: false })
      : { data: [] };

    return NextResponse.json({
      status: partner.status,
      appliedAt: partner.applied_at,
      decidedAt: partner.decided_at,
      pitch: partner.pitch,
      payout: {
        method: partner.payout_method,
        bank: partner.payout_bank,
        number: partner.payout_number,
        name: partner.payout_name,
      },
      summary,
      ladder: COMMISSION_LADDER,
      codes,
      // `admin_note` sengaja TIDAK ikut: itu catatan pemilik untuk dirinya
      // sendiri, dan alasan sebuah pengajuan ditolak bukan hal yang dikirim
      // begitu saja ke orang yang ditolak.
      commissions: (rows ?? []).map((r) => ({
        nth: r.nth,
        ratePercent: r.rate_percent,
        baseAmount: r.base_amount,
        amount: r.amount,
        paidAt: r.paid_at,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal memuat data partner:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
