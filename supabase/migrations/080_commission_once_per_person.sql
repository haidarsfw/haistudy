-- ============================================================================
-- 080 — Komisi dibayar SEKALI per orang yang diajak, tidak per pembelian
--
-- Keputusan pemilik yang terkunci: "Sekali bayar, tidak berulang." Tabelnya
-- menghitung "Orang ke-", bukan "pembelian ke-". Alasannya ditulis di plan:
-- retensi 64%, jadi perpanjangan terjadi dengan sendirinya, dan komisi yang
-- berulang paling bagus hanya impas.
--
-- Kode pertama yang ditulis membayar di SETIAP pembelian yang disetujui dari
-- orang yang diajak. Mentee yang membeli tiga periode akan menghasilkan tiga
-- komisi, dan tiap perpanjangan ikut menaikkan partner di tangga. Itu persis
-- yang ditolak.
--
-- Satu baris per pembeli, dijaga oleh database, bukan oleh kode saja: sama
-- seperti `referral_credits` yang unik per pemakaian (migrasi 063). Parsial,
-- karena `buyer_account` menjadi null kalau akunnya dihapus, dan baris lama
-- itu tetap harus bisa ada.
--
-- Aman diterapkan: tabelnya saat ini tidak berisi baris yang melanggar.
-- ============================================================================

create unique index if not exists partner_commissions_one_per_buyer
  on partner_commissions (buyer_account)
  where buyer_account is not null;
