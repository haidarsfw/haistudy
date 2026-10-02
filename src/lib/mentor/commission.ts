import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Komisi partner.
 *
 * Tangga marginal: tarif ditentukan oleh posisi penjualan ITU, bukan oleh total
 * yang sudah dikumpulkan. Penjualan ke-6 dibayar 30% — penjualan ke-1 sampai
 * ke-5 tetap 25% selamanya. Bentuk retroaktif ("sudah 16, bayar ulang semuanya
 * 35%") terdengar lebih murah hati tapi membuat tagihan masa lalu berubah tiap
 * ada penjualan baru, dan tidak ada yang bisa mengecek apa pun lagi.
 */
export const COMMISSION_LADDER = [
  { from: 1, to: 5, percent: 25 },
  { from: 6, to: 15, percent: 30 },
  { from: 16, to: null, percent: 35 },
] as const;

/** Cadangan, belum dipakai. Ditulis supaya angkanya ada di satu tempat. */
export const RESERVED_TOP_PERCENT = 40;

export function rateForNth(nth: number): number {
  for (const band of COMMISSION_LADDER) {
    if (nth >= band.from && (band.to === null || nth <= band.to)) return band.percent;
  }
  return COMMISSION_LADDER[0].percent;
}

/** Tangga berikutnya, untuk ditampilkan ke partner: "3 lagi menuju 30%". */
export function nextBand(nth: number): { percent: number; after: number } | null {
  const current = rateForNth(nth);
  for (const band of COMMISSION_LADDER) {
    if (band.percent > current) return { percent: band.percent, after: band.from };
  }
  return null;
}

export interface CommissionResult {
  partnerId: string;
  nth: number;
  ratePercent: number;
  baseAmount: number;
  amount: number;
}

const MAX_NTH_RETRIES = 3;

/**
 * Catat komisi untuk satu pembelian yang baru disetujui.
 *
 * Mengembalikan `null` kalau pembeli ini tidak datang dari partner aktif — itu
 * jalur yang normal, bukan kegagalan.
 *
 * KENAPA dasarnya `basePrice` dan bukan harga katalog: `basePrice` adalah yang
 * benar-benar dibayar setelah diskon. Membayar 25% dari harga katalog atas
 * penjualan yang didiskon membuat diskonnya dipotong dua kali dari margin —
 * sekali ke pembeli, sekali lagi ke partner.
 *
 * Barisnya dibekukan: tarif dan nominal ditulis sekali, tidak pernah dihitung
 * ulang. Tangga dan harga bisa berubah tahun depan; yang sudah terutang tidak
 * boleh ikut berubah diam-diam.
 */
export async function recordPartnerCommission(
  supabase: SupabaseClient,
  opts: {
    purchaseId: string;
    buyerAccountId: string | null;
    baseAmount: number;
  }
): Promise<CommissionResult | null> {
  const { purchaseId, buyerAccountId, baseAmount } = opts;
  if (!buyerAccountId || baseAmount <= 0) return null;

  // Siapa yang membawa dia. Satu baris per akun, dibuat saat registrasi.
  const { data: use } = await supabase
    .from("referral_uses")
    .select("code")
    .eq("account_id", buyerAccountId)
    .maybeSingle();
  if (!use?.code) return null;

  const { data: codeRow } = await supabase
    .from("referral_codes")
    .select("account_id")
    .eq("code", use.code as string)
    .maybeSingle();
  const referrerId = (codeRow?.account_id as string | null) ?? null;
  // Kode kampanye tidak punya pemilik, dan tidak ada yang bisa mereferensikan
  // dirinya sendiri.
  if (!referrerId || referrerId === buyerAccountId) return null;

  const { data: partner } = await supabase
    .from("partners")
    .select("id, status")
    .eq("account_id", referrerId)
    .maybeSingle();
  if (!partner || partner.status !== "active") return null;

  const partnerId = partner.id as string;

  // Sudah pernah dicatat? Menyetujui ulang pesanan yang sama tidak boleh
  // membayar dua kali. Dicek lebih dulu supaya jalur normal tidak mengandalkan
  // pelanggaran constraint sebagai alur kendali.
  const { data: existing } = await supabase
    .from("partner_commissions")
    .select("partner_id, nth, rate_percent, base_amount, amount")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (existing) {
    return {
      partnerId: existing.partner_id as string,
      nth: existing.nth as number,
      ratePercent: existing.rate_percent as number,
      baseAmount: existing.base_amount as number,
      amount: existing.amount as number,
    };
  }

  for (let attempt = 0; attempt < MAX_NTH_RETRIES; attempt++) {
    const { count } = await supabase
      .from("partner_commissions")
      .select("id", { head: true, count: "exact" })
      .eq("partner_id", partnerId);

    const nth = (count ?? 0) + 1 + attempt;
    const ratePercent = rateForNth(nth);
    // Dibulatkan ke bawah: pembulatan ke atas membuat total yang dibayarkan
    // melebihi persentase yang dijanjikan, dan selisih itu keluar dari margin.
    const amount = Math.floor((baseAmount * ratePercent) / 100);

    const { error } = await supabase.from("partner_commissions").insert({
      partner_id: partnerId,
      purchase_id: purchaseId,
      buyer_account: buyerAccountId,
      nth,
      rate_percent: ratePercent,
      base_amount: baseAmount,
      amount,
    });

    if (!error) {
      return { partnerId, nth, ratePercent, baseAmount, amount };
    }
    // 23505 = `nth` itu sudah dipakai (persetujuan lain mendahului), atau
    // pesanan ini sudah punya komisi. Coba nomor berikutnya.
    if (error.code !== "23505") {
      console.error("[komisi] gagal mencatat", error);
      return null;
    }
    const { data: now } = await supabase
      .from("partner_commissions")
      .select("partner_id, nth, rate_percent, base_amount, amount")
      .eq("purchase_id", purchaseId)
      .maybeSingle();
    if (now) {
      return {
        partnerId: now.partner_id as string,
        nth: now.nth as number,
        ratePercent: now.rate_percent as number,
        baseAmount: now.base_amount as number,
        amount: now.amount as number,
      };
    }
  }

  console.error("[komisi] menyerah setelah beberapa percobaan nomor urut", {
    purchaseId,
    partnerId,
  });
  return null;
}

/** Ringkasan untuk halaman partner: sudah berapa, tarif sekarang, belum dibayar. */
export async function partnerSummary(
  supabase: SupabaseClient,
  partnerId: string
): Promise<{
  sales: number;
  currentPercent: number;
  next: { percent: number; after: number } | null;
  earned: number;
  unpaid: number;
}> {
  const { data } = await supabase
    .from("partner_commissions")
    .select("amount, paid_at")
    .eq("partner_id", partnerId);

  const rows = data ?? [];
  const sales = rows.length;
  const earned = rows.reduce((n, r) => n + ((r.amount as number) ?? 0), 0);
  const unpaid = rows
    .filter((r) => !r.paid_at)
    .reduce((n, r) => n + ((r.amount as number) ?? 0), 0);

  // Tarif "sekarang" adalah tarif yang akan didapat penjualan BERIKUTNYA, bukan
  // tarif penjualan terakhir — itu yang ingin diketahui orang saat melihat
  // angkanya sebelum mengajak satu orang lagi.
  return {
    sales,
    currentPercent: rateForNth(sales + 1),
    next: nextBand(sales + 1),
    earned,
    unpaid,
  };
}
