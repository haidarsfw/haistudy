-- ============================================================================
-- 081 — Perk pembeli lewat kode: Kuota Latihan Soal +2
--
-- Keputusan pemilik (plan, tabel Perk): "Pembeli pakai kode → Kuota Latihan
-- Soal +2, nyala otomatis begitu periodenya terisi."
--
-- Kenapa di LISENSI dan bukan di `exam_quota_overrides`: tabel itu per mata
-- kuliah, dan saat pembelian disetujui mata kuliah periodenya belum tentu ada —
-- Latihan Soal B30 (`s1-uts-bm`) belum ditulis. Menempel di lisensi membuat
-- tambahan +2 berlaku untuk setiap mata kuliah begitu ia muncul, tanpa ada yang
-- perlu menulis baris baru nanti. Itulah "nyala otomatis".
--
-- Ini menambah JATAH, bukan melebarkan filter penghitung percobaan. Hitungan
-- percobaan per lisensi tidak disentuh; yang berubah hanya angka batasnya, dan
-- hanya untuk lisensi yang diberi perk. Dibatasi 0..10 supaya kesalahan ketik
-- tidak bisa diam-diam memberi tak terbatas.
-- ============================================================================

alter table license_keys
  add column if not exists referral_exam_bonus int not null default 0
  check (referral_exam_bonus between 0 and 10);

comment on column license_keys.referral_exam_bonus is
  'Tambahan kuota Latihan Soal per mata kuliah, untuk lisensi yang dibeli lewat kode referral. Ditambahkan di atas jatah tier.';
