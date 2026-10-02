-- ============================================================================
-- 079 — Batas laju untuk masuk grup lewat kode undangan
--
-- /api/mentor/join menerima kode 6 huruf dari akun mana pun yang sudah masuk,
-- tanpa batas. Ruangnya besar (31^6 ≈ 887 juta), tapi kode yang benar membuka
-- grup orang lain: daftar anggotanya, dan nanti chat dan jadwalnya. Sebuah
-- tebakan buta yang tidak dibatasi tetap tebakan yang bisa diulang selamanya.
--
-- Memakai tabel yang sudah ada untuk pekerjaan yang sama, bukan tabel baru.
-- Constraint-nya diganti dengan himpunan yang LEBIH BESAR: semua nilai lama tetap
-- ada, jadi setiap baris yang sudah tersimpan tetap sah dan tidak ada data yang
-- disentuh.
-- ============================================================================

alter table account_rate_events
  drop constraint if exists account_rate_events_kind_check;

alter table account_rate_events
  add constraint account_rate_events_kind_check
  check (kind = any (array[
    'login_fail', 'reset_request', 'verify_resend', 'referral_check',
    'nickname_check', 'delete_request',
    'group_join'
  ]));
