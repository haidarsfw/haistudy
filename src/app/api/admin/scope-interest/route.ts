import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";

/**
 * Siapa yang menunggu periodenya dibuka.
 *
 * Tombol "Kabari saya" di checkout berjanji: kami kabari lewat WhatsApp atau
 * email begitu periodenya dibuka. Janji itu hanya bisa ditepati kalau pemilik
 * bisa MELIHAT siapa yang menunggu. Sebelum ini daftarnya cuma ada di database,
 * dan satu-satunya cara membacanya adalah SQL.
 *
 * GET   — yang belum dikabari, dikelompokkan per periode, dengan kontaknya
 * PATCH — tandai sudah dikabari (satu orang, atau semua di satu periode)
 *
 * Kontak dibaca dari `accounts` saat ditampilkan, bukan disalin ke tabel ini:
 * migrasi 072 sengaja tidak menyimpan PII kedua.
 *
 * scope-exempt: rute admin, dan isinya justru periode yang BELUM bisa dibuka
 * siapa pun. Identitas dari `validateAdmin`.
 */
export async function GET() {
  const { authorized } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) return NextResponse.json({ waiting: [] });

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("scope_interest")
    .select("id, account_id, semester, exam_period, jurusan, package, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/scope-interest] gagal memuat:", error.message);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }

  const rows = data ?? [];
  const ids = [...new Set(rows.map((r) => r.account_id as string))];
  const { data: accounts } = ids.length
    ? await supabase
        .from("accounts")
        .select("id, full_name, nickname, email, whatsapp")
        .in("id", ids)
    : { data: [] };
  const byId = new Map((accounts ?? []).map((a) => [a.id as string, a]));

  return NextResponse.json({
    waiting: rows.map((r) => {
      const a = byId.get(r.account_id as string);
      return {
        id: r.id,
        scopeKey: `s${r.semester}-${r.exam_period}-${r.jurusan}`,
        package: r.package,
        createdAt: r.created_at,
        name: (a?.nickname as string) || (a?.full_name as string) || "",
        email: (a?.email as string) ?? null,
        whatsapp: (a?.whatsapp as string) ?? null,
      };
    }),
  });
}

export async function PATCH(req: Request) {
  const { authorized } = await validateAdmin();
  if (!authorized) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { id?: string; scopeKey?: string };
  const supabase = createServerClient()!;
  const now = new Date().toISOString();

  if (body.id) {
    const { error } = await supabase
      .from("scope_interest")
      .update({ notified_at: now })
      .eq("id", body.id)
      .is("notified_at", null);
    if (error) return NextResponse.json({ error: "Gagal menandai" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const m = /^s(\d{1,2})-(uts|uas)-([a-z0-9-]{1,16})$/.exec(String(body.scopeKey ?? ""));
  if (!m) return NextResponse.json({ error: "id atau periode wajib" }, { status: 400 });
  const { data, error } = await supabase
    .from("scope_interest")
    .update({ notified_at: now })
    .eq("semester", Number(m[1]))
    .eq("exam_period", m[2])
    .eq("jurusan", m[3])
    .is("notified_at", null)
    .select("id");
  if (error) return NextResponse.json({ error: "Gagal menandai" }, { status: 500 });
  return NextResponse.json({ ok: true, marked: (data ?? []).length });
}
