import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { partnerSummary } from "@/lib/mentor/commission";

const STATUSES = new Set(["pending", "active", "paused", "rejected"]);

/**
 * Partner, sisi pemilik: siapa mengajukan, siapa aktif, siapa belum dibayar.
 *
 * scope-exempt: rute admin, dan kemitraan tidak terikat periode ujian.
 * Identitas dari `validateAdmin`.
 */
export async function GET() {
  const { authorized } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }
  if (!isSupabaseServerConfigured) return NextResponse.json({ partners: [] });

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, account_id, status, pitch, admin_note, applied_at, decided_at, decided_by, payout_method, payout_bank, payout_number, payout_name"
    )
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat partner:", error.message);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }

  const rows = data ?? [];
  const accountIds = [...new Set(rows.map((r) => r.account_id as string))];
  const { data: accounts } = accountIds.length
    ? await supabase
        .from("accounts")
        .select("id, full_name, nickname, email, whatsapp")
        .in("id", accountIds)
    : { data: [] };
  const byId = new Map((accounts ?? []).map((a) => [a.id as string, a]));

  const partners = await Promise.all(
    rows.map(async (r) => {
      const a = byId.get(r.account_id as string);
      return {
        id: r.id,
        status: r.status,
        pitch: r.pitch,
        adminNote: r.admin_note,
        appliedAt: r.applied_at,
        decidedAt: r.decided_at,
        decidedBy: r.decided_by,
        account: a
          ? {
              name: (a.nickname as string) || (a.full_name as string) || "",
              email: a.email as string,
              whatsapp: a.whatsapp as string | null,
            }
          : null,
        payout: {
          method: r.payout_method,
          bank: r.payout_bank,
          number: r.payout_number,
          name: r.payout_name,
        },
        summary: await partnerSummary(supabase, r.id as string),
      };
    })
  );

  return NextResponse.json({ partners });
}

/**
 * Menyetujui, menjeda, menolak — dan menandai komisi sudah dibayar.
 *
 * Pembayaran dicatat di sini dan bukan dihitung dari mutasi bank: transfernya
 * terjadi di luar aplikasi, jadi satu-satunya kebenaran yang bisa dipegang
 * adalah pernyataan pemilik bahwa uangnya sudah dikirim, beserta tanggalnya.
 */
export async function PATCH(req: Request) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    adminNote?: string;
    markPaid?: boolean;
    paidNote?: string;
  };

  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });

  const supabase = createServerClient()!;

  if (body.markPaid) {
    // Hanya yang BELUM dibayar yang disentuh. Tanpa `is("paid_at", null)`,
    // menekan tombolnya dua kali akan menimpa tanggal pembayaran yang lama
    // dengan hari ini, dan catatan kapan uang benar-benar dikirim hilang.
    const { data: paid, error } = await supabase
      .from("partner_commissions")
      .update({
        paid_at: new Date().toISOString(),
        paid_note: String(body.paidNote ?? "").trim() || null,
      })
      .eq("partner_id", id)
      .is("paid_at", null)
      .select("id, amount");

    if (error) {
      console.error("Gagal menandai pembayaran:", error.message);
      return NextResponse.json({ error: "Gagal menandai" }, { status: 500 });
    }
    const rows = paid ?? [];
    const total = rows.reduce((n, r) => n + ((r.amount as number) ?? 0), 0);
    console.log(`[partner] ${licenseKey} menandai ${rows.length} komisi dibayar (${total})`);
    return NextResponse.json({ ok: true, markedPaid: rows.length, total });
  }

  const status = String(body.status ?? "").trim();
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Status tidak dikenal" }, { status: 400 });
  }

  const { error } = await supabase
    .from("partners")
    .update({
      status,
      admin_note: body.adminNote === undefined ? undefined : String(body.adminNote).trim() || null,
      decided_at: new Date().toISOString(),
      // Kunci admin, bukan nama: itu yang benar-benar diketahui `validateAdmin`,
      // dan itu yang bisa ditelusuri kembali kalau sebuah keputusan dipertanyakan.
      decided_by: licenseKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Gagal memperbarui partner:", error.message);
    return NextResponse.json({ error: "Gagal memperbarui" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
