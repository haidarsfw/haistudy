-- ============================================================================
-- 077 — Satu partner tidak boleh punya dua penjualan ke-N yang sama
--
-- `partner_commissions` sudah unik per `purchase_id`, jadi satu pesanan tidak
-- bisa dibayar dua kali. Tapi itu tidak menjaga `nth`, dan `nth` yang menentukan
-- tarifnya.
--
-- Nomor urutnya dihitung sebagai "berapa yang sudah ada, tambah satu". Kalau dua
-- pesanan disetujui nyaris bersamaan, keduanya bisa membaca angka yang sama dan
-- keduanya menulis penjualan ke-6 — dua baris 30% padahal yang satu seharusnya
-- ke-7. Tidak ada yang error, tidak ada yang kelihatan salah, dan angkanya
-- tinggal begitu selamanya karena baris komisi memang tidak pernah dihitung
-- ulang.
--
-- Index ini membuat tabrakan itu gagal dengan berisik, dan penulisnya mencoba
-- ulang dengan nomor berikutnya.
-- ============================================================================

create unique index if not exists partner_commissions_nth_unique
  on partner_commissions (partner_id, nth);
