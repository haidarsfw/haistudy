-- 086 · Jadwal sesi mentoring (B fase 1): sesi + agenda + catatan hasil sesi.
--
-- Satu baris per sesi. Ditulis HANYA lewat route API (service_role): mentor
-- grup membuat, mengubah, menandai selesai/batal, dan menulis catatannya;
-- anggota membaca. Tidak ikut realtime — jadwal dibaca saat dibuka, dan
-- setiap tabel di publikasi menambah beban decode WAL (FREE-TIER-GUARDRAILS.md).
--
-- agenda: daftar poin [{ "text": "...", "subjectId": "statistik"?, "module": "..."? }].
--   subjectId/module disiapkan untuk fase 2 (penanda modul → agenda), boleh kosong.
-- Sesi yang batal TIDAK dihapus (status='cancelled'): anggota yang sudah melihat
-- jadwalnya perlu tahu sesi itu batal, bukan mendapati sesinya hilang.

create table if not exists group_sessions (
  id                uuid primary key default uuid_generate_v4(),
  group_id          uuid not null references mentor_groups(id) on delete cascade,
  title             text not null check (char_length(trim(title)) between 1 and 80),
  starts_at         timestamptz not null,
  duration_minutes  int  not null default 90 check (duration_minutes between 15 and 480),
  place             text check (place is null or char_length(place) <= 200),
  agenda            jsonb not null default '[]'::jsonb check (jsonb_typeof(agenda) = 'array'),
  notes             text check (notes is null or char_length(notes) <= 4000),
  status            text not null default 'scheduled'
                    check (status in ('scheduled', 'done', 'cancelled')),
  created_by        uuid references accounts(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists group_sessions_group_time
  on group_sessions (group_id, starts_at);

alter table group_sessions enable row level security;
revoke all on group_sessions from anon, authenticated;
