-- 083 · Minta gabung grup (jalur masuk #3) — mentee minta, mentor setujui sekali ketuk.
--
-- 1) group_members.status mendapat 'declined'. Permintaan yang ditolak DISIMPAN,
--    bukan dihapus: kalau dihapus, orang yang sama bisa langsung minta lagi dan
--    mentornya ditanya hal yang sama berulang-ulang. Yang ditolak tetap bisa masuk
--    lewat link atau kode yang diberikan mentornya sendiri.
--
-- 2) notifications.type mendapat 'group_request' (ke mentor: ada yang minta
--    gabung) dan 'group_approved' (ke peminta: permintaannya disetujui).
--
-- Murni menambah nilai yang diizinkan. Tidak ada baris yang diubah, dan kode
-- produksi lama tidak pernah menulis nilai baru ini.

alter table group_members drop constraint if exists group_members_status_check;
alter table group_members add constraint group_members_status_check
  check (status in ('pending', 'invited', 'active', 'left', 'declined'));

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread',
    'poll_vote', 'poll_result', 'comment_reply', 'support_message', 'dm_message',
    'patch_note', 'exam_quota',
    'group_request', 'group_approved'
  ));
