import type { SupabaseClient } from "@supabase/supabase-js";

import { listAccountDevices } from "@/lib/auth/account-devices";

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

/**
 * Three outcomes, not two.
 *
 * "This buyer did not come from a partner" and "this buyer did, and writing it
 * down failed" used to both come back as `null`. The approval route reads null
 * as "not a partner" and pays the Rp5.000 referral balance instead — so a
 * database blip quietly swapped a partner's cash commission for a balance they
 * cannot withdraw. An error has to be told apart so the route can pay NOTHING
 * automatically and leave it for the owner to settle, rather than pay the wrong
 * thing.
 */
export type CommissionOutcome =
  /** The buyer was not brought by a partner. The ordinary referral rules apply. */
  | { kind: "none" }
  | { kind: "recorded"; commission: CommissionResult }
  /**
   * The buyer WAS brought by a partner, and this purchase earns nothing: the
   * partnership is paused, or this person has already been paid for once.
   * Distinct from "none" because the ordinary Rp5.000 balance must not be paid
   * either — a partner is on the cash side of the line, never the balance side.
   */
  | { kind: "skipped"; reason: "paused" | "already-paid-for-person" | "shared-device" }
  | { kind: "error"; partnerId: string | null; message: string };

/**
 * Enough for every approval in a burst to get its own number.
 *
 * Three was not: with six approvals landing at once (measured, against the real
 * table) the slowest writers ran out of attempts and their purchases were left
 * with no commission at all. The owner approves one order at a time, so a burst
 * like that should never happen — but whether a partner is paid must not depend
 * on how fast someone clicks.
 */
const MAX_NTH_RETRIES = 10;

/** A short random pause, so writers that collided do not collide again in step. */
function jitter(): Promise<void> {
  return new Promise((r) => setTimeout(r, 15 + Math.floor(Math.random() * 60)));
}

/**
 * Catat komisi untuk satu pembelian yang baru disetujui.
 *
 * SEKALI PER ORANG, bukan per pembelian. Keputusan pemilik: "Sekali bayar,
 * tidak berulang", dan tabelnya menghitung "Orang ke-". Retensi 64% berarti
 * mentee memperpanjang dengan sendirinya; komisi yang ikut berulang paling
 * bagus hanya impas. Jadi pembelian berikutnya dari orang yang sama tidak
 * dibayar, dan tidak menaikkan partner di tangga. `nth` menghitung ORANG.
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
    /** `meta.deviceId` of the order: the browser it was placed from. */
    buyerDeviceId?: string | null;
  }
): Promise<CommissionOutcome> {
  const { purchaseId, buyerAccountId, baseAmount, buyerDeviceId } = opts;
  if (!buyerAccountId || baseAmount <= 0) return { kind: "none" };

  // Siapa yang membawa dia. Satu baris per akun, dibuat saat registrasi.
  // Setiap bacaan memeriksa `error`: "tidak ada baris" dan "gagal membaca"
  // harus berbeda, karena yang kedua tidak boleh berakhir sebagai saldo.
  const { data: use, error: useErr } = await supabase
    .from("referral_uses")
    .select("code")
    .eq("account_id", buyerAccountId)
    .maybeSingle();
  if (useErr) return { kind: "error", partnerId: null, message: useErr.message };
  if (!use?.code) return { kind: "none" };

  const { data: codeRow, error: codeErr } = await supabase
    .from("referral_codes")
    .select("account_id")
    .eq("code", use.code as string)
    .maybeSingle();
  if (codeErr) return { kind: "error", partnerId: null, message: codeErr.message };
  const referrerId = (codeRow?.account_id as string | null) ?? null;
  // Kode kampanye tidak punya pemilik, dan tidak ada yang bisa mereferensikan
  // dirinya sendiri.
  if (!referrerId || referrerId === buyerAccountId) return { kind: "none" };

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .select("id, status")
    .eq("account_id", referrerId)
    .maybeSingle();
  if (partnerErr) return { kind: "error", partnerId: null, message: partnerErr.message };
  // Pending and rejected are not partners yet (or any more): an ordinary
  // referrer, ordinary balance.
  if (!partner || (partner.status !== "active" && partner.status !== "paused")) {
    return { kind: "none" };
  }
  // Paused means "kept, not earning". Not commission, and not the balance
  // either, or the pause would be a demotion to a cheaper reward rather than
  // a pause.
  if (partner.status === "paused") return { kind: "skipped", reason: "paused" };

  const partnerId = partner.id as string;

  // Sudah pernah dicatat? Menyetujui ulang pesanan yang sama tidak boleh
  // membayar dua kali. Dicek lebih dulu supaya jalur normal tidak mengandalkan
  // pelanggaran constraint sebagai alur kendali.
  const { data: existing, error: existingErr } = await supabase
    .from("partner_commissions")
    .select("partner_id, nth, rate_percent, base_amount, amount")
    .eq("purchase_id", purchaseId)
    .maybeSingle();
  if (existingErr) return { kind: "error", partnerId, message: existingErr.message };
  if (existing) return { kind: "recorded", commission: fromRow(existing) };

  // Already paid for this PERSON, on an earlier purchase: this one is a renewal.
  const { data: earlier, error: earlierErr } = await supabase
    .from("partner_commissions")
    .select("id")
    .eq("buyer_account", buyerAccountId)
    .limit(1)
    .maybeSingle();
  if (earlierErr) return { kind: "error", partnerId, message: earlierErr.message };
  if (earlier) return { kind: "skipped", reason: "already-paid-for-person" };

  // The owner's anti-fraud rule: no commission when the "referred" buyer is on
  // the partner's own device. That is a partner buying through a second
  // account to pay themselves 25% back. Checked against every device the
  // partner has ever entered the app with, and every browser they have placed
  // their own orders from. Never by IP: a mentor and their class share a campus
  // network, and an IP match would refuse exactly the mentees this is for.
  if (buyerDeviceId && referrerId) {
    const shared = await isPartnerDevice(supabase, referrerId, buyerDeviceId);
    if (shared) return { kind: "skipped", reason: "shared-device" };
  }

  for (let attempt = 0; attempt < MAX_NTH_RETRIES; attempt++) {
    // The next number is the highest one so far plus one, re-read on every
    // attempt. It used to be `count + 1 + attempt`: after a collision the
    // re-read count already included the row that won, so adding `attempt` on
    // top skipped a number — sale 9 recorded as sale 10, and at a band edge
    // that is the wrong rate, frozen forever. The highest number also cannot
    // collide with a gap left by a deleted row, which a count can.
    const { data: top, error: topErr } = await supabase
      .from("partner_commissions")
      .select("nth")
      .eq("partner_id", partnerId)
      .order("nth", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (topErr) return { kind: "error", partnerId, message: topErr.message };

    const nth = ((top?.nth as number | undefined) ?? 0) + 1;
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
      return {
        kind: "recorded",
        commission: { partnerId, nth, ratePercent, baseAmount, amount },
      };
    }
    // 23505 = `nth` itu sudah dipakai (persetujuan lain mendahului), atau
    // pesanan ini sudah punya komisi. Baca ulang, lalu coba nomor berikutnya.
    if (error.code !== "23505") {
      return { kind: "error", partnerId, message: error.message };
    }
    const { data: now } = await supabase
      .from("partner_commissions")
      .select("partner_id, nth, rate_percent, base_amount, amount")
      .eq("purchase_id", purchaseId)
      .maybeSingle();
    if (now) return { kind: "recorded", commission: fromRow(now) };
    // Two purchases by the SAME person approved at once: the other one won the
    // one-per-buyer index (migration 080), so this one is the renewal.
    const { data: sameBuyer } = await supabase
      .from("partner_commissions")
      .select("id")
      .eq("buyer_account", buyerAccountId)
      .limit(1)
      .maybeSingle();
    if (sameBuyer) return { kind: "skipped", reason: "already-paid-for-person" };
    await jitter();
  }

  return {
    kind: "error",
    partnerId,
    message: "nomor urut terus bertabrakan setelah beberapa percobaan",
  };
}

function fromRow(row: Record<string, unknown>): CommissionResult {
  return {
    partnerId: row.partner_id as string,
    nth: row.nth as number,
    ratePercent: row.rate_percent as number,
    baseAmount: row.base_amount as number,
    amount: row.amount as number,
  };
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

  // Tarif "sekarang" adalah tarif untuk ORANG berikutnya yang membeli, bukan
  // tarif orang terakhir: itu yang ingin diketahui partner sebelum mengajak
  // satu orang lagi. Satu baris = satu orang (migrasi 080).
  return {
    sales,
    currentPercent: rateForNth(sales + 1),
    next: nextBand(sales + 1),
    earned,
    unpaid,
  };
}

/** Has this browser ever been the partner's own? */
async function isPartnerDevice(
  supabase: SupabaseClient,
  partnerAccountId: string,
  deviceId: string
): Promise<boolean> {
  const { devices } = await listAccountDevices(supabase, partnerAccountId);
  if (devices.some((d) => d.deviceId === deviceId)) return true;

  const { data: ownOrders } = await supabase
    .from("purchase_requests")
    .select("id")
    .eq("account_id", partnerAccountId)
    .eq("meta->>deviceId", deviceId)
    .limit(1);
  return (ownOrders ?? []).length > 0;
}
