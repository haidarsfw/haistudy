export const akuntansiModule4 = `
<h1>Modul 4: Operasi Perdagangan dan Laporan Laba Rugi Multi-Langkah (Sesi 7 & 8)</h1>

<h2>Karakteristik Operasi Perusahaan Dagang</h2>

Perusahaan dagang merupakan entitas yang menghasilkan pendapatan melalui pembelian dan penjualan barang dagangan. Siklus operasi perusahaan dagang lebih panjang dibandingkan perusahaan jasa karena mencakup tahapan pembelian persediaan, penjualan barang, hingga penagihan piutang dari pelanggan.

Arus biaya entitas dagang mengikuti formula dasar: Persediaan Awal ditambah Pembelian menghasilkan Barang Tersedia untuk Dijual. Saat barang laku, nilainya dialihkan menjadi <b>Harga Pokok Penjualan (HPP)</b>, sedangkan sisa barang yang tidak terjual dilaporkan sebagai Persediaan Akhir di Neraca.

Terdapat dua sistem pencatatan persediaan:
<bullet><b>Sistem Perpetual:</b> Rincian setiap transaksi pembelian dan penjualan dicatat secara terus-menerus (real-time). Harga Pokok Penjualan dihitung langsung setiap kali transaksi penjualan terjadi.</bullet>
<bullet><b>Sistem Periodik:</b> Pencatatan tidak dilakukan secara rinci per transaksi. Harga Pokok Penjualan hanya dihitung pada akhir periode akuntansi melalui proses perhitungan fisik persediaan secara langsung di lapangan.</bullet>

<h2>Pencatatan Pembelian Barang Dagangan (Sistem Perpetual)</h2>

Pembelian barang untuk dijual kembali dicatat secara langsung ke dalam akun aset Persediaan (Inventory).

<bullet><b>Biaya Pengiriman (Freight Costs):</b> Syarat pengiriman menentukan pihak penanggung biaya. Pada <b>FOB Shipping Point</b>, pembeli membayar biaya angkut dan nilainya didebit untuk menambah akun Persediaan. Pada <b>FOB Destination</b>, penjual membayar biaya angkut dan nilainya dicatat sebagai Beban Angkut Penjualan (Freight-Out).</bullet>
<bullet><b>Retur dan Potongan Pembelian (Purchase Returns and Allowances):</b> Pengembalian barang cacat kepada pemasok akan mengkredit (mengurangi) akun Persediaan dan mendebit (mengurangi) Utang Usaha.</bullet>
<bullet><b>Diskon Pembelian (Purchase Discounts):</b> Insentif dari penjual untuk pelunasan awal sesuai syarat kredit (contoh: 2/10, n/30 berarti diskon 2% jika dibayar dalam 10 hari). Diskon yang diambil dikreditkan ke akun Persediaan untuk mengurangi harga pokok barang (lihat materi sesi 7, slide "Purchase Discounts").</bullet>

<b>Contoh:</b> Pembayaran utang Rp1.000.000 dengan diskon 2% dicatat dengan mendebit Utang Usaha Rp1.000.000, mengkredit Kas Rp980.000, dan mengkredit Persediaan Rp20.000.

<h2>Pencatatan Penjualan Barang Dagangan (Sistem Perpetual)</h2>

Pendapatan penjualan diakui saat kewajiban pelaksanaan terpenuhi, yakni saat barang berpindah tangan ke pembeli. Setiap transaksi penjualan membutuhkan dua entri jurnal simultan: (1) mendebit Kas/Piutang dan mengkredit Pendapatan Penjualan sebesar harga jual, (2) mendebit Harga Pokok Penjualan dan mengkredit Persediaan sebesar harga pokok barang.

<bullet><b>Retur dan Potongan Penjualan (Sales Returns and Allowances):</b> Merupakan akun kontra-pendapatan bersaldo normal debit. Transaksi ini mencatat pengembalian barang dari pelanggan dan membutuhkan pembalikan entri persediaan jika barang dikembalikan ke gudang.</bullet>
<bullet><b>Diskon Penjualan (Sales Discounts):</b> Akun kontra-pendapatan bersaldo normal debit untuk mencatat insentif tunai yang dimanfaatkan pelanggan akibat pembayaran cepat.</bullet>

<b>Contoh:</b> Pemberian diskon penjualan Rp20.000 atas tagihan Rp1.000.000 dicatat dengan mendebit Kas Rp980.000, mendebit Diskon Penjualan Rp20.000, dan mengkredit Piutang Usaha Rp1.000.000.

<h2>Laporan Laba Rugi Multi-Langkah (Multiple-Step Income Statement)</h2>

Laporan ini menyoroti komponen penting performa finansial dengan memisahkan aktivitas operasi dari aktivitas non-operasi (lihat materi sesi 7, slide "Multiple-Step Income Statement").

Struktur perhitungannya meliputi:
<bullet><b>Penjualan Bersih (Net Sales):</b> Total Penjualan dikurangi Retur Penjualan dan Diskon Penjualan.</bullet>
<bullet><b>Laba Kotor (Gross Profit):</b> Penjualan Bersih dikurangi Harga Pokok Penjualan. Angka ini merepresentasikan margin kotor produk sebelum beban operasional.</bullet>
<bullet><b>Laba dari Operasi (Income from Operations):</b> Laba Kotor dikurangi total Beban Operasi (biaya penjualan dan administrasi).</bullet>
<bullet><b>Pendapatan dan Beban Lain-lain:</b> Menambahkan aktivitas non-operasi (seperti pendapatan bunga, sewa, atau dividen) dan mengurangkan kerugian non-operasi (seperti beban bunga, kerugian penjualan aset) untuk mendapatkan metrik final berupa Laba Bersih (Net Income).</bullet>

<h2>Sistem Periodik dan Rasio Profitabilitas</h2>

Pada sistem periodik, Harga Pokok Penjualan ditentukan pada akhir periode dengan rumus: Persediaan Awal ditambahkan dengan Pembelian Bersih dan Biaya Angkut Masuk untuk menghasilkan Barang Tersedia untuk Dijual, kemudian hasilnya dikurangi Persediaan Akhir (lihat materi sesi 7, slide "Determining Cost of Goods Sold Under a Periodic System").

Kinerja perusahaan dievaluasi menggunakan dua metrik rasio:
<bullet><b>Tingkat Laba Kotor (Gross Profit Rate):</b> Dihitung dengan membagi Laba Kotor dengan Penjualan Bersih. Rasio ini mengukur margin kontribusi produk terhadap beban operasi.</bullet>
<bullet><b>Margin Laba (Profit Margin):</b> Dihitung dengan membagi Laba Bersih dengan Penjualan Bersih. Rasio ini mengukur persentase sisa pendapatan yang berhasil dikonversi menjadi laba akhir bagi entitas bisnis.</bullet>
`;
