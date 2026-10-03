-- 088 · Komentar materi ala Google Docs (B fase 2, bagian terakhir).
--
-- Satu tabel untuk komentar dan balasannya (parent_id), satu tabel reaksi.
-- Ditulis dan dibaca HANYA lewat API (service_role), yang memeriksa visibilitas:
--   private — hanya penulis
--   group   — anggota + mentor grup itu (group_id wajib)
--   period  — siapa pun yang punya akses periode itu
-- Balasan menyalin visibilitas + group_id akarnya, jadi satu filter berlaku untuk
-- seluruh utas.
--
-- Jangkar (anchor_*) hanya di akar: kutipan teks + baris + posisi karakter, seperti
-- stabilo. Modul yang diedit menggeser baris; teks kutipannya dicari ulang, dan bila
-- tidak ketemu komentar TETAP tampil di panel dengan tanda "teks sudah berubah" —
-- tidak pernah hilang. module_id = id stabil ("m3"), bukan judul.
--
-- Penulis yang menghapus akunnya: account_id jadi null, author_name tetap, supaya
-- utas orang lain tidak bolong. Tidak ikut realtime (dibaca saat panel dibuka).

create table if not exists material_comments (
  id            uuid primary key default uuid_generate_v4(),
  account_id    uuid references accounts(id) on delete set null,
  author_name   text not null check (char_length(author_name) between 1 and 60),
  semester      int  not null check (semester between 1 and 14),
  exam_period   text not null check (exam_period in ('uts','uas')),
  jurusan       text not null check (jurusan ~ '^[a-z0-9-]{1,16}$'),
  subject_id    text not null check (char_length(subject_id) between 1 and 60),
  module_id     text not null check (char_length(module_id) between 1 and 80),
  parent_id     uuid references material_comments(id) on delete cascade,
  anchor_text   text check (anchor_text is null or char_length(anchor_text) <= 600),
  anchor_line   int,
  anchor_start  int,
  anchor_end    int,
  visibility    text not null check (visibility in ('private', 'group', 'period')),
  group_id      uuid references mentor_groups(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  resolved_at   timestamptz,
  edited_at     timestamptz,
  deleted       boolean not null default false,
  created_at    timestamptz not null default now(),
  check (visibility <> 'group' or group_id is not null)
);
create index if not exists material_comments_module
  on material_comments (semester, exam_period, jurusan, subject_id, module_id, created_at);
create index if not exists material_comments_parent
  on material_comments (parent_id) where parent_id is not null;
alter table material_comments enable row level security;
revoke all on material_comments from anon, authenticated;

create table if not exists material_comment_reactions (
  comment_id  uuid not null references material_comments(id) on delete cascade,
  account_id  uuid not null references accounts(id) on delete cascade,
  emoji       text not null check (emoji in ('👍', '❤️', '😂', '🎉', '🤔', '🙏')),
  created_at  timestamptz not null default now(),
  primary key (comment_id, account_id, emoji)
);
alter table material_comment_reactions enable row level security;
revoke all on material_comment_reactions from anon, authenticated;

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread',
    'poll_vote', 'poll_result', 'comment_reply', 'support_message', 'dm_message',
    'patch_note', 'exam_quota',
    'group_request', 'group_approved',
    'package_upgraded',
    'session_summary',
    'material_comment'
  ));
