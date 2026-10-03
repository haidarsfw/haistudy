import { NextResponse } from "next/server";

import { createServerClient, isSupabaseServerConfigured } from "@/lib/supabase/server";
import { validateAdmin } from "@/lib/auth/admin-guard";
import { mintAccountReferralCode } from "@/lib/referral/codes";
import { parseScopeKey, isAvailableScope } from "@/lib/scope";
import {
  GROUP_COLUMNS,
  activateMentorPartner,
  generateUniqueGroupCode,
  toMentorGroup,
  type GroupRow,
} from "@/lib/mentor/groups";

/**
 * Grup mentoring, sisi pemilik.
 *
 * Grup HANYA dibuat dari sini, tidak oleh mentornya sendiri. Alasannya bukan
 * birokrasi: punya grup aktif adalah definisi "mentor" di aplikasi ini, dan
 * mentor mendapat perk yang nyata (kuota tak terbatas, lencana, siaran ke
 * anggota). Kalau siapa pun boleh membuat grup, siapa pun boleh memberi
 * dirinya sendiri perk itu. Kesepakatan mentor memang per orang, jadi pintunya
 * memang milik pemilik.
 *
 * Mentor tetap menjalankan grupnya sendiri setelah dibuat — mengundang,
 * menyetujui, menjadwalkan — tanpa `is_admin` sama sekali.
 *
 * scope-exempt: scope di sini adalah periode yang DIAJARKAN, yang hampir
 * selalu bukan periode admin yang sedang membuka panel. `requireScope` akan
 * menolak hal yang benar. Identitas datang dari `validateAdmin`, dan scope
 * divalidasi ke SCOPE_REGISTRY.
 */
export async function GET() {
  const { authorized } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }
  if (!isSupabaseServerConfigured) return NextResponse.json({ groups: [] });

  const supabase = createServerClient()!;
  const { data, error } = await supabase
    .from("mentor_groups")
    .select(GROUP_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Gagal memuat grup mentoring:", error.message);
    return NextResponse.json({ error: "Gagal memuat" }, { status: 500 });
  }

  const rows = (data ?? []) as GroupRow[];
  const ownerIds = [...new Set(rows.map((r) => r.owner_account_id))];
  const { data: owners } = ownerIds.length
    ? await supabase
        .from("accounts")
        .select("id, full_name, nickname, email")
        .in("id", ownerIds)
    : { data: [] };

  const ownerById = new Map(
    (owners ?? []).map((o) => [
      o.id as string,
      { name: (o.nickname as string) || (o.full_name as string) || "", email: o.email as string },
    ])
  );

  // Jumlah anggota dihitung sekali untuk semua grup, bukan satu query per
  // baris: panel ini menampilkan seluruh daftar sekaligus.
  const { data: memberRows } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("status", "active");
  const counts = new Map<string, number>();
  for (const m of memberRows ?? []) {
    const id = m.group_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return NextResponse.json({
    groups: rows.map((row) => ({
      ...toMentorGroup(row),
      owner: ownerById.get(row.owner_account_id) ?? null,
      memberCount: counts.get(row.id) ?? 0,
    })),
  });
}

export async function POST(req: Request) {
  const { authorized, licenseKey } = await validateAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 });
  }
  if (!isSupabaseServerConfigured) {
    return NextResponse.json({ error: "Database tidak tersedia" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ownerEmail?: string;
    name?: string;
    scope?: string;
    maxMembers?: number | null;
    note?: string;
  };

  const name = String(body.name ?? "").trim();
  if (name.length < 1 || name.length > 60) {
    return NextResponse.json({ error: "Nama grup 1–60 karakter" }, { status: 400 });
  }

  const scope = parseScopeKey(String(body.scope ?? ""));
  if (!scope || !isAvailableScope(scope)) {
    return NextResponse.json({ error: "Periode tidak dikenal" }, { status: 400 });
  }

  const email = String(body.ownerEmail ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email mentor wajib diisi" }, { status: 400 });
  }

  const supabase = createServerClient()!;
  const { data: owner } = await supabase
    .from("accounts")
    .select("id, full_name, nickname, email")
    .eq("email_lower", email)
    .maybeSingle();

  if (!owner) {
    // Sengaja terus terang: ini panel pemilik, bukan halaman publik, dan
    // "akun tidak ditemukan" adalah satu-satunya jawaban yang bisa ditindak.
    return NextResponse.json(
      { error: "Belum ada akun dengan email itu" },
      { status: 404 }
    );
  }

  const maxMembers =
    typeof body.maxMembers === "number" && body.maxMembers > 0
      ? Math.floor(body.maxMembers)
      : null;

  let inviteCode: string;
  try {
    inviteCode = await generateUniqueGroupCode(supabase);
  } catch {
    return NextResponse.json({ error: "Gagal membuat kode undangan" }, { status: 500 });
  }

  const { data: created, error } = await supabase
    .from("mentor_groups")
    .insert({
      owner_account_id: owner.id,
      name,
      semester: scope.semester,
      exam_period: scope.examPeriod,
      jurusan: scope.jurusan,
      invite_code: inviteCode,
      max_members: maxMembers,
      note: String(body.note ?? "").trim() || null,
    })
    .select(GROUP_COLUMNS)
    .single();

  if (error || !created) {
    console.error("Gagal membuat grup mentoring:", error?.message);
    return NextResponse.json({ error: "Gagal membuat grup" }, { status: 500 });
  }

  // Pemilik grup juga dicatat sebagai anggota ber-peran mentor. Kepemilikan
  // sudah cukup untuk hak akses, tapi tanpa baris ini dia tidak muncul di
  // daftar anggota yang dilihat mentee — dan grup yang mentornya tidak
  // kelihatan adalah grup yang tampak kosong.
  const { error: memberError } = await supabase.from("group_members").insert({
    group_id: created.id,
    account_id: owner.id,
    role: "mentor",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  if (memberError) {
    console.error("Grup dibuat tapi baris mentor gagal:", memberError.message);
  }

  // A mentor with no referral code earns nothing: no /@CODE/grup link, nothing
  // for an invite or the class code to attach. Accounts created before codes
  // existed have none, so one is minted here, now, not "later when /account
  // asks" — a mentor may share the group link long before opening /account.
  await mintAccountReferralCode(supabase, owner.id as string).catch((e) =>
    console.error("Kode referral mentor gagal dibuat:", e)
  );

  const partnerStatus = await activateMentorPartner(
    supabase,
    owner.id as string,
    `Mentor grup "${name}" (otomatis saat grup dibuat)`,
    licenseKey
  );

  console.log(
    `Grup mentoring dibuat oleh ${licenseKey}: ${created.id} untuk ${owner.email}, partner=${partnerStatus}`
  );

  return NextResponse.json({
    group: {
      ...toMentorGroup(created as GroupRow),
      owner: {
        name: (owner.nickname as string) || (owner.full_name as string) || "",
        email: owner.email as string,
      },
      memberCount: memberError ? 0 : 1,
    },
    partnerStatus,
  });
}
