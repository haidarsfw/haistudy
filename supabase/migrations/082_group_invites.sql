-- ============================================================================
-- 082 — Undangan grup lewat email/WhatsApp (jalur masuk #1, jaring atribusi #3)
--
-- Dari plan: "Mentor undang dari dashboard pakai WA/email (utama — dia pegang
-- daftar resmi kampus). Ini juga jaring atribusi #3." Dan: "Jaring 3 membuat
-- mentor praktis tidak bisa kehilangan mentee-nya sendiri."
--
-- Satu baris per kontak per grup. Saat seseorang mendaftar dengan email atau
-- WhatsApp yang cocok, barisnya ditautkan ke akunnya (`account_id`,
-- `matched_at`), dia masuk grup sebagai 'invited', dan — HANYA kalau jaring 1
-- dan 2 kosong (tidak mengetik kode, tidak lewat link) — kode pemilik grup
-- dipasang sebagai referrer-nya.
--
-- Akun yang SUDAH ada saat diundang masuk grup sebagai 'invited', tapi tidak
-- diberi referrer otomatis. Atribusi akun lama adalah jaring #4: manual, oleh
-- pemilik, dengan bukti. Tanpa batas itu, daftar undangan bisa dipakai menempel
-- mentor ke pembeli lama siapa pun yang alamatnya diketahui.
--
-- PII: kontak di sini dimasukkan mentor sendiri, untuk orang di kelasnya. RLS
-- nyala, tanpa policy, dicabut dari anon & authenticated — service_role saja.
-- Tidak masuk realtime publication.
-- ============================================================================

create table if not exists group_invites (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references mentor_groups(id) on delete cascade,
  kind        text not null check (kind in ('email', 'whatsapp')),
  -- Dinormalkan sebelum disimpan: email huruf kecil, WhatsApp angka saja
  -- berawalan 62. Tanpa itu "0812…" dan "+62 812…" adalah dua orang.
  value       text not null check (char_length(value) between 5 and 120),
  invited_by  uuid references accounts(id) on delete set null,
  account_id  uuid references accounts(id) on delete set null,
  matched_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (group_id, kind, value)
);

-- Pertanyaan yang ditanyakan setiap kali seseorang mendaftar: "apakah ada yang
-- menunggu orang dengan kontak ini?" Parsial: yang sudah cocok tidak dicari lagi.
create index if not exists group_invites_open_idx
  on group_invites (kind, value)
  where account_id is null;

create index if not exists group_invites_group_idx
  on group_invites (group_id, created_at);

alter table group_invites enable row level security;
revoke all on group_invites from anon, authenticated;
