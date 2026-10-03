-- 084 · Naik paket sendiri (self-serve tier upgrade).
--
-- Pemilik akses Share/Normal/VIP bisa naik ke VIP atau Diamond dengan membayar
-- SELISIH harga daftar. Pesanannya baris purchase_requests biasa, supaya riwayat
-- penjualan tetap satu tempat, dengan package = 'upgrade' dan license_key = akses
-- yang dinaikkan. Saat disetujui, lisensi yang SAMA diubah tier-nya; tidak ada
-- kunci baru, masa aktif tidak berubah.
--
-- 1) purchase_requests.package mendapat 'upgrade'.
-- 2) notifications.type mendapat 'package_upgraded' (kabar ke pembeli).
--
-- Murni menambah nilai yang diizinkan; tidak ada baris yang diubah.

alter table purchase_requests drop constraint if exists purchase_requests_package_check;
alter table purchase_requests add constraint purchase_requests_package_check
  check (package in ('share', 'normal', 'vip', 'diamond', 'discount', 'free', 'exam_quota', 'upgrade'));

alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'mention', 'mention_all', 'thread_reply', 'announcement', 'forum_thread',
    'poll_vote', 'poll_result', 'comment_reply', 'support_message', 'dm_message',
    'patch_note', 'exam_quota',
    'group_request', 'group_approved',
    'package_upgraded'
  ));
