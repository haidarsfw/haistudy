import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { requireAccount } from "@/lib/auth/account-session";
import { AccountError } from "@/lib/auth/account";
import { loadGroupsForAccount, activeMemberCount } from "@/lib/mentor/groups";

/**
 * "Grup apa yang saya pegang, dan grup apa yang saya ikuti."
 *
 * Dua daftar terpisah dengan sengaja — lihat `loadGroupsForAccount`.
 *
 * scope-exempt: pertanyaannya justru lintas periode. Seorang mentor berada di
 * Semester 3 sambil mengajar `s1-uts-bm`; `requireScope` hanya tahu periode
 * tempat dia sedang berdiri dan akan menyembunyikan grup yang dia ajar.
 * Identitas datang dari cookie akun, dan tiap grup yang dikembalikan sudah
 * terbukti miliknya lewat kepemilikan atau keanggotaan aktif.
 */
export async function GET() {
  try {
    const account = await requireAccount();
    if (!isSupabaseServerConfigured) {
      return NextResponse.json({ mentoring: [], joined: [] });
    }

    const supabase = createServerClient()!;
    const { mentoring, joined } = await loadGroupsForAccount(supabase, account.id);

    // Jumlah anggota hanya untuk grup yang dia ajar. Mentee tidak perlu tahu
    // berapa banyak orang di grup, dan menghitungnya untuk mereka adalah query
    // yang tidak ada yang membaca.
    const withCounts = await Promise.all(
      mentoring.map(async (g) => ({
        ...g,
        memberCount: await activeMemberCount(supabase, g.id),
      }))
    );

    return NextResponse.json({
      mentoring: withCounts,
      // Kode undangan adalah milik mentor, bukan informasi anggota: mentee yang
      // memegangnya bisa mengajak orang masuk ke grup yang bukan grupnya.
      //
      // Ditulis sebagai daftar yang BOLEH keluar, bukan `...rest` dikurangi
      // satu field. Bentuk pengurangan akan diam-diam meloloskan field sensitif
      // berikutnya yang ditambahkan ke MentorGroup; daftar ini menolaknya.
      joined: joined.map((g) => ({
        id: g.id,
        ownerAccountId: g.ownerAccountId,
        name: g.name,
        scope: g.scope,
        scopeKey: g.scopeKey,
        inviteOpen: g.inviteOpen,
        status: g.status,
        maxMembers: g.maxMembers,
        note: g.note,
        createdAt: g.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof AccountError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Response) return error;
    console.error("Gagal memuat grup:", error);
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
