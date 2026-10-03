import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import {
  GROUP_COLUMNS,
  activeMemberCount,
  checkGroupJoinQuota,
  recordGroupJoinAttempt,
  toMentorGroup,
  type GroupRow,
} from "@/lib/mentor/groups";

const CODE_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Masuk grup dengan kode undangan.
 *
 * Tidak ada syarat sudah membeli periode itu, dan itu disengaja: justru
 * urutannya yang diharapkan adalah mentor mengundang dulu, mentee masuk, lalu
 * membeli pakai kode mentornya. Mewajibkan lisensi lebih dulu akan menutup
 * pintu tepat di tempat program ini seharusnya bekerja.
 *
 * scope-exempt: dia belum tentu punya akses ke periode grupnya — itu justru
 * kasus yang normal di sini. Identitas datang dari cookie akun; grupnya
 * ditemukan lewat kode undangan, bukan lewat id yang bisa ditebak.
 */
export async function POST(req: Request) {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!CODE_RE.test(code)) {
      return NextResponse.json({ error: "Kode undangan tidak valid" }, { status: 400 });
    }

    const supabase = createServerClient()!;

    // Dihitung sebelum mencari, dan dihitung juga kalau kodenya benar: kalau
    // hanya tebakan yang salah yang dihitung, tebakan yang benar jadi gratis.
    const gate = await checkGroupJoinQuota(supabase, account.id);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
        { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
      );
    }
    await recordGroupJoinAttempt(supabase, account.id);

    const { data: group } = await supabase
      .from("mentor_groups")
      .select(GROUP_COLUMNS)
      .eq("invite_code", code)
      .maybeSingle();

    // Kode salah dan grup yang sudah diarsipkan menjawab sama. Membedakannya
    // memberi tahu orang asing bahwa sebuah kode PERNAH benar, yang mengubah
    // tebakan buta menjadi pencarian terarah.
    if (!group || group.status !== "active") {
      return NextResponse.json({ error: "Kode undangan tidak ditemukan" }, { status: 404 });
    }
    if (!group.invite_open) {
      return NextResponse.json(
        { error: "Grup ini sedang tidak menerima anggota baru" },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from("group_members")
      .select("id, status, role")
      .eq("group_id", group.id)
      .eq("account_id", account.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return NextResponse.json({
        ok: true,
        already: true,
        group: toMentorGroup(group as GroupRow),
      });
    }
    // Dikeluarkan mentor: link dan kode tidak membawanya masuk lagi (temuan
    // F37: dulu setiap baris lama diaktifkan ulang). Hanya mentornya yang
    // bisa mengizinkan lagi.
    if (existing?.status === "removed") {
      return NextResponse.json(
        { error: "Mentor grup ini sudah mengeluarkanmu. Hubungi mentornya kalau kamu ingin kembali." },
        { status: 403 }
      );
    }

    // Batas anggota diperiksa SEBELUM menulis, dan hanya menghitung yang
    // benar-benar di dalam. Yang pernah keluar lalu masuk lagi tidak menambah
    // kursi baru — barisnya diperbarui, bukan dibuat ulang.
    const max = group.max_members as number | null;
    if (max !== null) {
      const current = await activeMemberCount(supabase, group.id as string);
      if (current >= max) {
        return NextResponse.json({ error: "Grup ini sudah penuh" }, { status: 409 });
      }
    }

    const now = new Date().toISOString();
    const payload = {
      status: "active" as const,
      // Perannya TIDAK ikut diperbarui. Seorang mentor kedua yang pernah keluar
      // lalu memakai kode undangan biasa tidak boleh kehilangan perannya, dan
      // mentee tidak boleh mendapatkannya.
      joined_at: now,
      left_at: null,
    };

    const { error } = existing
      ? await supabase.from("group_members").update(payload).eq("id", existing.id)
      : await supabase.from("group_members").insert({
          group_id: group.id,
          account_id: account.id,
          role: "member",
          ...payload,
        });

    if (error) {
      console.error("Gagal bergabung ke grup:", error.message);
      return NextResponse.json({ error: "Gagal bergabung" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, group: toMentorGroup(group as GroupRow) });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal bergabung ke grup:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
