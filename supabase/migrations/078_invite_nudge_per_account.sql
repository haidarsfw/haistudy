-- ============================================================================
-- 078 — Nudge "ajak teman": ingat jawabannya pada ORANGNYA
--
-- Migrasi 074 menaruh `invite_nudge_dismissed_at` di `user_settings`. Itu salah
-- tempat, dengan cara yang persis sama seperti penanda tur sebelum migrasi 075:
-- `user_settings` di-key oleh `license_key`, dan satu lisensi adalah SATU
-- PERIODE UJIAN. Orang yang menekan "jangan tampilkan lagi" akan mendapat baris
-- setelan yang kosong begitu dia membeli periode berikutnya, dan modalnya
-- kembali kepada orang yang sudah menjawab tidak. Ditanya lagi setelah bilang
-- tidak persis bagian yang membuat orang kesal.
--
-- Kolom 074 tidak dihapus, dan tidak pernah dibaca siapa pun: belum ada kode
-- yang menulisnya, jadi tidak ada data yang hilang. Menghapus kolom adalah
-- operasi merusak yang tidak membeli apa pun di sini.
--
-- `shown_at` ada supaya "sesekali" punya arti yang bisa diperiksa. Tanpa itu,
-- satu-satunya cara membatasi frekuensi adalah localStorage, yang lupa setiap
-- kali orangnya ganti perangkat, dan "sesekali" berubah jadi "tiap kali di HP
-- baru".
-- ============================================================================

alter table accounts
  add column if not exists invite_nudge_dismissed_at timestamptz,
  add column if not exists invite_nudge_shown_at timestamptz;

comment on column accounts.invite_nudge_dismissed_at is
  'Kapan orang ini menekan "jangan tampilkan lagi". Null = masih boleh muncul. Menggantikan user_settings.invite_nudge_dismissed_at (migrasi 074) yang per lisensi dan tidak dipakai.';

comment on column accounts.invite_nudge_shown_at is
  'Kapan modal ajakan terakhir ditampilkan ke orang ini, supaya "sesekali" dihitung per orang dan bukan per perangkat.';
