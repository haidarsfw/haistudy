export const akuntansiModule4 = `
<h1>Modul 4: Operasi Perdagangan dan Laporan Laba Rugi Multi-Langkah (Sesi 7 & 8)</h1>

<h2>Karakteristik Operasi Perusahaan Dagang</h2>

Perusahaan dagang adalah bisnis yang menghasilkan pendapatan dari membeli lalu menjual barang dagangan. Siklus operasinya lebih panjang dari perusahaan jasa karena mencakup pembelian persediaan, penjualan barang, sampai penagihan piutang dari pelanggan.

Alur biaya perusahaan dagang mengikuti formula dasar: Persediaan Awal + Pembelian = Barang Tersedia untuk Dijual. Saat barang terjual, nilainya jadi <b>Harga Pokok Penjualan (HPP)</b>. Barang yang belum terjual dilaporkan sebagai Persediaan Akhir di Neraca.

Ada dua sistem pencatatan persediaan:
<bullet><b>Sistem Perpetual:</b> Setiap transaksi pembelian dan penjualan dicatat secara real-time. HPP langsung dihitung setiap kali ada penjualan.</bullet>
<bullet><b>Sistem Periodik:</b> Pencatatan tidak dilakukan per transaksi. HPP baru dihitung di akhir periode lewat penghitungan fisik persediaan di lapangan.</bullet>

<h2>Pencatatan Pembelian Barang Dagangan (Sistem Perpetual)</h2>

Pembelian barang untuk dijual kembali langsung dicatat ke akun aset Persediaan (Inventory).

<bullet><b>Biaya Pengiriman (Freight Costs):</b> Syarat pengiriman menentukan siapa yang bayar ongkir. Pada <b>FOB Shipping Point</b>, pembeli yang bayar — nilainya didebit ke Persediaan. Pada <b>FOB Destination</b>, penjual yang bayar — dicatat sebagai Beban Angkut Penjualan (Freight-Out).</bullet>
<bullet><b>Retur dan Potongan Pembelian (Purchase Returns and Allowances):</b> Kalau barang cacat dikembalikan ke pemasok, Persediaan dikredit (berkurang) dan Utang Usaha didebit (berkurang).</bullet>
<bullet><b>Diskon Pembelian (Purchase Discounts):</b> Potongan harga dari penjual kalau bayar lebih awal sesuai syarat kredit (contoh: 2/10, n/30 artinya diskon 2% kalau bayar dalam 10 hari). Diskon yang diambil dikredit ke Persediaan untuk mengurangi harga pokok barang (lihat materi sesi 7, slide "Purchase Discounts").</bullet>

<b>Contoh:</b> Bayar utang Rp1.000.000 dengan diskon 2% — debit Utang Usaha Rp1.000.000, kredit Kas Rp980.000, kredit Persediaan Rp20.000.

<h2>Pencatatan Penjualan Barang Dagangan (Sistem Perpetual)</h2>

Pendapatan penjualan diakui saat barang sudah berpindah tangan ke pembeli (kewajiban pelaksanaan terpenuhi). Setiap penjualan butuh dua entri jurnal sekaligus: (1) debit Kas/Piutang dan kredit Pendapatan Penjualan sebesar harga jual, (2) debit Harga Pokok Penjualan dan kredit Persediaan sebesar harga pokok barang.

<bullet><b>Retur dan Potongan Penjualan (Sales Returns and Allowances):</b> Akun kontra-pendapatan bersaldo normal debit. Mencatat pengembalian barang dari pelanggan — kalau barangnya masuk gudang lagi, entri persediaan juga harus dibalik.</bullet>
<bullet><b>Diskon Penjualan (Sales Discounts):</b> Akun kontra-pendapatan bersaldo normal debit untuk mencatat potongan tunai yang diambil pelanggan karena bayar cepat.</bullet>

<b>Contoh:</b> Diskon penjualan Rp20.000 atas tagihan Rp1.000.000 — debit Kas Rp980.000, debit Diskon Penjualan Rp20.000, kredit Piutang Usaha Rp1.000.000.

<h2>Laporan Laba Rugi Multi-Langkah (Multiple-Step Income Statement)</h2>

Laporan ini menyoroti komponen penting kinerja keuangan dengan memisahkan aktivitas operasi dari non-operasi (lihat materi sesi 7, slide "Multiple-Step Income Statement").

Struktur perhitungannya:
<bullet><b>Penjualan Bersih (Net Sales):</b> Total Penjualan dikurangi Retur Penjualan dan Diskon Penjualan.</bullet>
<bullet><b>Laba Kotor (Gross Profit):</b> Penjualan Bersih dikurangi HPP. Angka ini menunjukkan margin kotor produk sebelum beban operasional diperhitungkan.</bullet>
<bullet><b>Laba dari Operasi (Income from Operations):</b> Laba Kotor dikurangi total Beban Operasi (biaya penjualan dan administrasi).</bullet>
<bullet><b>Pendapatan dan Beban Lain-lain:</b> Ditambah aktivitas non-operasi (seperti pendapatan bunga, sewa, dividen) dan dikurangi kerugian non-operasi (seperti beban bunga, kerugian penjualan aset) untuk mendapatkan angka final: Laba Bersih (Net Income).</bullet>

<h2>Sistem Periodik dan Rasio Profitabilitas</h2>

Pada sistem periodik, HPP dihitung di akhir periode dengan rumus: Persediaan Awal + Pembelian Bersih + Biaya Angkut Masuk = Barang Tersedia untuk Dijual, lalu dikurangi Persediaan Akhir (lihat materi sesi 7, slide "Determining Cost of Goods Sold Under a Periodic System").

Kinerja perusahaan dinilai pakai dua rasio:
<bullet><b>Tingkat Laba Kotor (Gross Profit Rate):</b> Laba Kotor dibagi Penjualan Bersih. Mengukur seberapa besar margin produk untuk menutup beban operasi.</bullet>
<bullet><b>Margin Laba (Profit Margin):</b> Laba Bersih dibagi Penjualan Bersih. Mengukur berapa persen pendapatan yang berhasil jadi laba akhir.</bullet>
`;
