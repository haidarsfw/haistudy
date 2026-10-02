import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";

const PITCH_MIN = 20;
const PITCH_MAX = 1000;
const PAYOUT_METHODS = new Set(["bank", "ewallet"]);

/**
 * Mengajukan diri jadi partner, dan memperbarui rekening pembayaran.
 *
 * POST  — kirim pengajuan (sekali; mengirim lagi memperbarui yang sama)
 * PATCH — isi atau ubah tujuan pembayaran
 *
 * Dipisah karena waktunya berbeda. Rekening diminta SETELAH disetujui, bukan di
 * formulir pengajuan: tidak ada alasan menyimpan nomor rekening orang yang
 * mungkin tidak pernah jadi partner.
 *
 * scope-exempt: kemitraan bukan milik satu periode ujian. Identitas dari cookie
 * akun, dan setiap tulisan terikat ke baris milik akun itu sendiri.
 */
export async function POST(req: Request) {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as { pitch?: string };
    const pitch = String(body.pitch ?? "").trim();
    if (pitch.length < PITCH_MIN) {
      return NextResponse.json(
        { error: `Ceritakan sedikit lebih panjang, minimal ${PITCH_MIN} karakter` },
        { status: 400 }
      );
    }
    if (pitch.length > PITCH_MAX) {
      return NextResponse.json(
        { error: `Maksimal ${PITCH_MAX} karakter` },
        { status: 400 }
      );
    }

    const supabase = createServerClient()!;
    const { data: existing } = await supabase
      .from("partners")
      .select("id, status")
      .eq("account_id", account.id)
      .maybeSingle();

    // Yang sudah aktif tidak mengajukan ulang. Membiarkannya lewat akan
    // mengembalikan statusnya ke 'pending' dan memutus komisinya sampai ada
    // yang menyetujui lagi.
    if (existing && (existing.status === "active" || existing.status === "paused")) {
      return NextResponse.json(
        { error: "Kamu sudah terdaftar sebagai partner" },
        { status: 409 }
      );
    }

    // Pernah ditolak lalu mengajukan lagi: barisnya dipakai ulang dan kembali
    // ke 'pending'. Keputusan lama tetap terlihat lewat `decided_at`, jadi
    // orang yang sama tidak diperiksa dari nol.
    const { error } = await supabase.from("partners").upsert(
      {
        account_id: account.id,
        pitch,
        status: "pending",
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    );

    if (error) {
      console.error("Gagal menyimpan pengajuan partner:", error.message);
      return NextResponse.json({ error: "Gagal mengirim pengajuan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "pending" });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal mengirim pengajuan partner:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      method?: string;
      bank?: string;
      number?: string;
      name?: string;
    };

    const method = String(body.method ?? "").trim();
    if (!PAYOUT_METHODS.has(method)) {
      return NextResponse.json({ error: "Pilih bank atau e-wallet" }, { status: 400 });
    }
    const bank = String(body.bank ?? "").trim();
    const number = String(body.number ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!bank || !number || !name) {
      return NextResponse.json(
        { error: "Nama bank/e-wallet, nomor, dan nama pemilik wajib diisi" },
        { status: 400 }
      );
    }
    // Nomor rekening dan nomor e-wallet sama-sama angka, kadang dengan pemisah.
    // Yang ditolak di sini hanya yang jelas bukan nomor, supaya format bank
    // yang tidak terduga tidak ikut tertolak.
    if (!/^[0-9][0-9\s-]{4,24}$/.test(number)) {
      return NextResponse.json({ error: "Nomor tidak terbaca" }, { status: 400 });
    }

    const supabase = createServerClient()!;
    const { data: partner } = await supabase
      .from("partners")
      .select("id, status")
      .eq("account_id", account.id)
      .maybeSingle();

    if (!partner) {
      return NextResponse.json({ error: "Kamu belum jadi partner" }, { status: 404 });
    }
    // Rekening hanya diterima dari kemitraan yang sudah diputuskan. Menyimpan
    // nomor rekening orang yang pengajuannya masih menggantung, atau yang sudah
    // ditolak, berarti memegang data keuangan yang tidak akan pernah dipakai —
    // dan tabel ini satu-satunya tempat data itu ada.
    if (partner.status !== "active" && partner.status !== "paused") {
      return NextResponse.json(
        { error: "Tujuan pembayaran diisi setelah kemitraanmu disetujui" },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("partners")
      .update({
        payout_method: method,
        payout_bank: bank,
        payout_number: number,
        payout_name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (error) {
      console.error("Gagal menyimpan tujuan pembayaran:", error.message);
      return NextResponse.json({ error: "Gagal menyimpan" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal menyimpan tujuan pembayaran:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
