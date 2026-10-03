-- 089 · B fase 3: keluarkan anggota, booking 1-on-1, siaran pemilik, peringkat.
--
-- 1) group_members.status + 'removed' — DIKELUARKAN mentor, beda dari 'left'
--    (keluar sendiri). /api/mentor/join selama ini mengaktifkan ulang semua
--    baris 'left' (temuan F37): yang dikeluarkan bisa masuk lagi lewat link.
--    'removed' tidak bisa masuk lewat link/kode atau minta gabung; hanya mentor
--    yang bisa mengizinkannya lagi.
-- 2) group_members.rank_hidden — anggota yang tidak mau namanya tampil di
--    peringkat grup (tampil sebagai "Anggota").
-- 3) group_slots — slot 1-on-1 yang dibuka mentor dan dipesan satu anggota.
-- 4) mentor_broadcasts — pesan pemilik ke semua mentor (riwayatnya dibaca di
--    /partner); tiap kiriman juga jadi notifikasi in-app.
-- 5) notifications.type + 'mentor_broadcast', 'slot_booked', 'slot_cancelled'.
--
-- Semua aditif. Tabel baru terkunci (RLS tanpa policy, tanpa grant), tidak ikut
-- realtime: dibaca saat halamannya dibuka.

alter table group_members drop constraint if exists group_members_status_check;
alter table group_members add constraint group_members_status_check
  check (status in ('pending', 'invited', 'active', 'left', 'declined', 'removed'));

alter table group_members add column if not exists rank_hidden boolean not null default false;

create table if not exists group_slots (
  id                uuid primary key default uuid_generate_v4(),
  group_id          uuid not null references mentor_groups(id) on delete cascade,
  mentor_account_id uuid not null references accounts(id) on delete cascade,
  starts_at         timestamptz not null,
  duration_minutes  int not null check (duration_minutes between 10 and 120),
  place             text check (place is null or char_length(place) <= 200),
  -- 'open' menunggu dipesan, 'booked' sudah dipesan satu orang, 'cancelled'
  -- dibatalkan mentor. Anggota yang membatalkan mengembalikannya ke 'open'.
  status            text not null default 'open' check (status in ('open', 'booked', 'cancelled')),
  booked_by         uuid references accounts(id) on delete set null,
  booked_at         timestamptz,
  topic             text check (topic is null or char_length(topic) <= 300),
  created_at        timestamptz not null default now(),
  check ((status = 'booked') = (booked_by is not null))
);
create index if not exists group_slots_group_time on group_slots (group_id, starts_at);
create index if not exists group_slots_booker on group_slots (booked_by) where booked_by is not null;
alter table group_slots enable row level security;
revoke all on group_slots from anon, authenticated;

create table if not exists mentor_broadcasts (
  id          uuid primary key default uuid_generate_v4(),
  body        text not null check (char_length(body) between 1 and 2000),
  sent_by     text,
  recipients  int not null default 0,
  created_at  timestamptz not null default now()
);
alter table mentor_broadcasts enable row level security;
revoke all on mentor_broadcasts from anon, authenticated;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread',
    'poll_vote', 'poll_result', 'comment_reply', 'support_message', 'dm_message',
    'patch_note', 'exam_quota',
    'group_request', 'group_approved',
    'package_upgraded',
    'session_summary',
    'material_comment',
    'mentor_broadcast', 'slot_booked', 'slot_cancelled'
  ));
