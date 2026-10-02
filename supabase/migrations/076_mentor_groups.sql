-- ============================================================================
-- 076 — Grup mentoring: siapa mengajar siapa, periode apa
--
-- Dua hubungan yang sengaja DIPISAH, bukan satu kolom `is_mentor`:
--
--   partners        — hubungan UANG (migrasi 073). Dia membawa pembeli, dia
--                     dapat komisi. Belum tentu mengajar.
--   mentor_groups   — hubungan MENGAJAR. Dia punya grup berisi mentee.
--                     Belum tentu dibayar.
--
-- Seseorang bisa salah satu, bisa dua-duanya. Menggabungkannya jadi satu flag
-- memaksa pemilik menyetujui orang sebagai partner hanya supaya dia boleh
-- mengajar, dan memaksa setiap partner punya grup yang tidak pernah dia pakai.
--
-- ⚠️ Mentor BUKAN admin. Tidak ada satu pun kolom di sini yang menyentuh
-- `license_keys.is_admin`. Hak mentor berhenti di grupnya sendiri.
--
-- KENAPA grup punya scope sendiri: mentor mengajar periode yang BUKAN
-- periodenya. Putra ada di Semester 3, mentee-nya B30 di `s1-uts-bm`. Scope di
-- sini adalah yang DIAJARKAN, bukan tempat mentornya berada. Menurunkannya
-- dari lisensi mentor akan salah untuk setiap mentor yang ada.
--
-- RLS nyala, tanpa policy, dicabut dari anon dan authenticated — service_role
-- saja, sama seperti `partners`. Tidak ada yang masuk realtime publication:
-- belum ada yang berlangganan, dan publication itu tagihan WAL free-tier.
-- ============================================================================

-- ─── 1. Grupnya ───

create table if not exists mentor_groups (
  id          uuid primary key default uuid_generate_v4(),
  owner_account_id uuid not null references accounts(id) on delete cascade,

  name        text not null check (char_length(trim(name)) between 1 and 60),

  -- Periode yang DIAJARKAN. Sengaja tidak punya DEFAULT: menebak periode grup
  -- adalah cara paling halus untuk menaruh mentee di kelas yang salah.
  semester    int  not null check (semester between 1 and 14),
  exam_period text not null check (exam_period in ('uts','uas')),
  jurusan     text not null check (jurusan ~ '^[a-z0-9-]{1,16}$'),

  -- Jalan masuk kedua: `/@nama/grup`. Huruf besar, tanpa karakter yang mudah
  -- tertukar saat dibacakan di kelas — alfabet yang sama dengan kunci lisensi.
  invite_code text not null unique
              check (invite_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$'),
  -- Mematikan tautannya tanpa membubarkan grup, misalnya saat kelas sudah penuh.
  invite_open boolean not null default true,

  -- 'active'   — berjalan
  -- 'archived' — periodenya selesai; isinya tetap bisa dibaca, tidak bisa ditambah
  status      text not null default 'active'
              check (status in ('active', 'archived')),

  -- Batas anggota. Null = tanpa batas, karena pemilik belum menetapkan angka
  -- dan menebak 30 lalu memblokir mentee ke-31 lebih buruk daripada tidak
  -- membatasi sama sekali.
  max_members int check (max_members is null or max_members > 0),

  note        text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Pertanyaan yang ditanyakan tiap kali seseorang membuka aplikasi: "grup apa
-- yang saya pegang?" Partial, karena yang diarsipkan tidak pernah ikut.
create index if not exists mentor_groups_owner_idx
  on mentor_groups (owner_account_id)
  where status = 'active';

-- Daftar grup per periode, untuk panel admin.
create index if not exists mentor_groups_scope_idx
  on mentor_groups (semester, exam_period, jurusan)
  where status = 'active';

-- ─── 2. Anggotanya ───

create table if not exists group_members (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references mentor_groups(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,

  -- 'mentor' — boleh mengundang, menjadwalkan, menyiarkan. Pemilik grup selalu
  --            punya baris ini; mentor kedua bisa ditambahkan tanpa memindahkan
  --            kepemilikan.
  -- 'member' — mentee.
  role        text not null default 'member'
              check (role in ('mentor', 'member')),

  -- 'pending'  — dia yang meminta masuk (jalur ketiga), menunggu mentor
  -- 'invited'  — mentor yang mengundang, menunggu dia
  -- 'active'   — di dalam
  -- 'left'     — keluar atau dikeluarkan. Barisnya TIDAK dihapus: tanpa ini,
  --              orang yang dikeluarkan tinggal pakai tautan undangan lagi, dan
  --              catatan kehadiran sesi kehilangan nama pemiliknya.
  status      text not null default 'active'
              check (status in ('pending', 'invited', 'active', 'left')),

  invited_by  uuid references accounts(id) on delete set null,
  joined_at   timestamptz,
  left_at     timestamptz,
  created_at  timestamptz not null default now(),

  -- Satu orang, satu baris per grup, selamanya. Masuk lagi setelah keluar
  -- memperbarui baris yang sama — bukan baris kedua yang membuat jumlah
  -- anggota terhitung dua kali.
  unique (group_id, account_id)
);

create index if not exists group_members_group_idx
  on group_members (group_id, role)
  where status = 'active';

-- "Saya anggota grup mana?" — dijawab tanpa memindai grup orang lain.
create index if not exists group_members_account_idx
  on group_members (account_id)
  where status = 'active';

-- Antrean persetujuan mentor.
create index if not exists group_members_pending_idx
  on group_members (group_id, created_at)
  where status in ('pending', 'invited');

-- ─── 3. Dikunci ───

alter table mentor_groups  enable row level security;
alter table group_members  enable row level security;

revoke all on mentor_groups from anon, authenticated;
revoke all on group_members from anon, authenticated;

comment on table mentor_groups is
  'Hubungan MENGAJAR. Terpisah dari `partners` (hubungan uang) dengan sengaja. Scope-nya adalah periode yang diajarkan, bukan periode mentornya.';
comment on table group_members is
  'Keanggotaan grup. Baris yang keluar disimpan (status=left), tidak dihapus, supaya undangan lama tidak bisa dipakai masuk kembali diam-diam dan riwayat sesi tetap punya nama.';
