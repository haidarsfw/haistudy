-- 087 · B fase 2 (tanpa komentar materi, yang menyusul di migrasinya sendiri).
--
-- 1) module_marks — penanda per modul: 'want' (🔖 mau dibahas) dan 'done'
--    (✅ sudah). Pribadi untuk semua orang; untuk anggota grup, 'want' sekaligus
--    jadi usulan ke mentor. 📌 "dijadwalkan" dan ✅ grup TIDAK disimpan di sini:
--    diturunkan dari agenda sesi (agenda item membawa subjectId + module), supaya
--    tidak ada dua sumber kebenaran yang bisa tidak sinkron.
--    module_id = id stabil dari nomor modul ("m3"), BUKAN judul: judul yang
--    diganti memutus penanda (pelajaran dari bug stabilo 7eb77a2).
-- 2) session_attendance — RSVP anggota (hadir/tidak + alasan) dan kehadiran
--    yang diisi mentor setelah sesi.
-- 3) group_sessions + series_id (sesi berulang mingguan, dibatalkan/diubah
--    bersama) + prep (yang perlu disiapkan anggota sebelum sesi).
-- 4) group_messages + is_question / answered_at — papan pertanyaan grup memakai
--    pesan chat yang ditandai pertanyaan ("Tanya mentor" otomatis), bukan tabel baru.
-- 5) notifications.type + 'session_summary' — catatan sesi dikirim ke yang tidak hadir.
--
-- Semua aditif. Tabel baru terkunci (RLS tanpa policy, tanpa grant), tidak ikut
-- realtime; group_messages sudah REPLICA IDENTITY FULL, kolom baru ikut otomatis.

create table if not exists module_marks (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid not null references accounts(id) on delete cascade,
  semester      int  not null check (semester between 1 and 14),
  exam_period   text not null check (exam_period in ('uts','uas')),
  jurusan       text not null check (jurusan ~ '^[a-z0-9-]{1,16}$'),
  subject_id    text not null check (char_length(subject_id) between 1 and 60),
  module_id     text not null check (char_length(module_id) between 1 and 80),
  module_title  text check (module_title is null or char_length(module_title) <= 200),
  status        text not null check (status in ('want', 'done')),
  updated_at    timestamptz not null default now(),
  unique (account_id, semester, exam_period, jurusan, subject_id, module_id)
);
create index if not exists module_marks_want
  on module_marks (semester, exam_period, jurusan, subject_id, module_id)
  where status = 'want';
alter table module_marks enable row level security;
revoke all on module_marks from anon, authenticated;

create table if not exists session_attendance (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references group_sessions(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  rsvp        text check (rsvp is null or rsvp in ('going', 'not_going')),
  reason      text check (reason is null or char_length(reason) <= 200),
  attended    boolean,
  updated_at  timestamptz not null default now(),
  unique (session_id, account_id)
);
alter table session_attendance enable row level security;
revoke all on session_attendance from anon, authenticated;

alter table group_sessions add column if not exists series_id uuid;
alter table group_sessions add column if not exists prep text
  check (prep is null or char_length(prep) <= 1000);
create index if not exists group_sessions_series
  on group_sessions (series_id) where series_id is not null;

alter table group_messages add column if not exists is_question boolean not null default false;
alter table group_messages add column if not exists answered_at timestamptz;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread',
    'poll_vote', 'poll_result', 'comment_reply', 'support_message', 'dm_message',
    'patch_note', 'exam_quota',
    'group_request', 'group_approved',
    'package_upgraded',
    'session_summary'
  ));
