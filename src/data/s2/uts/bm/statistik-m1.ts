export const statistikModule1 = `
<h1>Modul 1: Pengantar Statistika Bisnis & Deskripsi Data</h1>

<h2>Topik 1: Pengantar Statistika Bisnis</h2>

Statistika penting di karir apa pun. Data ada di mana-mana, jadi kita butuh cara menganalisisnya supaya bisa membandingkan hasil dan memprediksi keputusan bisnis.
<slide src="statistik/data-never-sleeps.png" alt="Infografis Data Never Sleeps"/>
Statistika adalah ilmu mengumpulkan, merapikan, menyajikan, menganalisis, dan menafsirkan data supaya keputusan kita lebih tepat.
<b>Contoh praktis:</b> Membandingkan tingkat inflasi tahun ini sebesar 5.4% dengan tahun lalu.

<h3>Jenis Statistika</h3>
<bullet><b>Statistika Deskriptif:</b> Merapikan, meringkas, dan menyajikan data supaya mudah dibaca. Contoh: Meringkas total 46.837 mil jalan raya antarnegara bagian.</bullet>
<bullet><b>Statistika Inferensial:</b> Menebak sifat populasi dari sampel acak. Contoh: Ambil sampel acak untuk memperkirakan berapa banyak orang yang belum divaksin COVID-19.</bullet>

<h3>Populasi dan Sampel</h3>
<slide src="statistik/populasi-sampel.png" alt="Diagram Populasi dan Sampel"/>
<bullet><b>Populasi:</b> Semua individu atau objek yang ingin kita teliti.</bullet>
<bullet><b>Sampel:</b> Sebagian kecil dari populasi yang diambil untuk dianalisis.</bullet>

<h3>Jenis Variabel</h3>
<slide src="statistik/types-of-variables.png" alt="Bagan Types of Variables"/>
<bullet><b>Kualitatif:</b> Data non-angka yang menggambarkan ciri. Contoh: Jenis kelamin atau warna rambut.</bullet>
<bullet><b>Kuantitatif:</b> Data berupa angka, terbagi dua:</bullet>
<bullet><b>Diskret:</b> Hasil hitungan dengan jarak antar nilai. Contoh: Jumlah kamar di rumah.</bullet>
<bullet><b>Kontinu:</b> Hasil pengukuran yang bisa bernilai berapa saja dalam rentang tertentu. Contoh: Lama penerbangan 5.25 jam.</bullet>

<h3>Tingkat Pengukuran</h3>
<slide src="statistik/levels-of-measurement.png" alt="Bagan Levels of Measurement"/>
Tingkat ini menentukan jenis analisis statistik yang cocok dipakai.
<bullet><b>Nominal:</b> Tingkat paling dasar. Cuma label, tanpa urutan, dan hanya untuk mengelompokkan. Contoh: Warna M&M.</bullet>
<bullet><b>Ordinal:</b> Data berbentuk peringkat atau rating. Contoh: Sepuluh negara bagian dengan iklim bisnis terbaik.</bullet>
<bullet><b>Interval:</b> Punya urutan, jarak antar nilai bermakna, tapi tidak punya titik nol mutlak. Contoh: Suhu dalam Fahrenheit.</bullet>
<bullet><b>Rasio:</b> Tingkat tertinggi. Jarak antar nilai bermakna dan punya titik nol mutlak (artinya benar-benar tidak ada). Contoh: Jumlah upah karyawan.</bullet>

<h3>Etika dan Analitik Bisnis</h3>
Statistika harus dijalankan dengan jujur, berintegritas, dan independen. Analis harus berani menolak laporan yang bias atau sampel yang tidak mewakili.
Analitik bisnis menggabungkan statistik dengan software modern untuk menceritakan data dan mendukung keputusan di perusahaan.
<slide src="statistik/excel-profit-otomotif.png" alt="Tabel Data Excel Profit Otomotif"/>

<h2>Topik 2: Deskripsi Data, Distribusi Frekuensi, dan Penyajian Visual</h2>

<h3>Konstruksi Tabel Frekuensi Data Kualitatif</h3>
Saat mengelompokkan data kualitatif, kelas harus <b>mutually exclusive</b> (satu nilai hanya masuk satu kelas) dan <b>collectively exhaustive</b> (setiap nilai pasti punya kelas).
Caranya: sortir kelasnya, lalu hitung jumlah observasi di tiap kelas sebagai frekuensi dasar.
Frekuensi relatif adalah jumlah per kelas dibagi total observasi. Contoh: 52 mobil di Kane dari total 180 mobil menghasilkan frekuensi relatif 0.289.
<slide src="statistik/frekuensi-tabel-penjualan.png" alt="Tabel Data Penjualan Mobil Harian"/>
<slide src="statistik/frekuensi-relatif-perhitungan.png" alt="Perhitungan Frekuensi Relatif Penjualan Mobil"/>

<h3>Visualisasi Variabel Kualitatif</h3>
<bullet><b>Bar Chart:</b> Diagram batang. Sumbu mendatar menunjukkan jenis kategori, tinggi balok vertikal menunjukkan frekuensinya. Untuk data nominal, urutan balok bebas. Balok paling tinggi disebut <b>Modus</b>.</bullet>
<slide src="statistik/bar-chart.png" alt="Contoh Bar Chart Penjualan Mobil"/>
<slide src="statistik/bar-chart-pengurutan.png" alt="Pengurutan Variasi Nominal Bar Chart"/>
<bullet><b>Pie Chart:</b> Diagram lingkaran berupa irisan. Tiap irisan menunjukkan persentase tiap kelas dari total keseluruhan.</bullet>
<slide src="statistik/pie-chart-kendaraan.png" alt="Pie Chart Persentase Kendaraan"/>

<h3>Distribusi Frekuensi Data Kuantitatif</h3>
Yaitu pengelompokan data angka ke dalam kelas yang <b>mutually exclusive</b> dan <b>collectively exhaustive</b>, lewat 4 langkah baku.
<slide src="statistik/dataset-mentah-180.png" alt="180 Dataset Mentah Profit Otomotif"/>
<slide src="statistik/formula-batas-kelas.png" alt="Formula Batas Kelas dan Persentase"/>
Jumlah kelas dihitung dengan rumus $2^k > n$. Contoh: Untuk $n=180$ observasi, kita butuh 8 kelas ($k=8$) agar cukup.
<slide src="statistik/penentuan-jumlah-kelas.png" alt="Penentuan Jumlah Kelas: 2^k > n"/>
Lebar interval tiap kelas dihitung dengan rumus $i \\ge (Maksimum - Minimum) / k$. Contoh: Selisih profit maksimum dan minimum dibagi 8 menghasilkan interval $400.
<slide src="statistik/penentuan-interval.png" alt="Penentuan Lebar Interval Kelas"/>
Lalu susun batas atas dan bawah tiap kelas di tabel.
<slide src="statistik/limit-batas-kelas.png" alt="Penyusunan Limit Batas Tiap Kelas"/>
Terakhir, hitung frekuensi di tiap kelas dan bagi jadi frekuensi relatif.
<slide src="statistik/frekuensi-per-kelas.png" alt="Frekuensi Observasi Per Kelas"/>
<slide src="statistik/frekuensi-relatif-per-kelas.png" alt="Frekuensi Relatif Per Kelas"/>

<h3>Penyajian Grafik Data Kuantitatif</h3>
<bullet><b>Histogram:</b> Balok-balok yang rapat tanpa celah. Sumbu mendatar menunjukkan rentang angka, sumbu vertikal menunjukkan frekuensi mutlak.</bullet>
<slide src="statistik/histogram-profit.png" alt="Histogram Profit $200-$3400"/>
<bullet><b>Frequency Polygon:</b> Garis yang menghubungkan titik tengah tiap interval kelas. Cocok dipakai untuk membandingkan beberapa kelompok data sekaligus.</bullet>
<slide src="statistik/frequency-polygon.png" alt="Frequency Polygon Profit"/>
<slide src="statistik/polygon-perbandingan.png" alt="Polygon Perbandingan Fowler Motors vs Applewood"/>

<h3>Distribusi Kumulatif</h3>
Distribusi kumulatif dipakai untuk melihat total akumulasi data saat bergerak dari kelas satu ke kelas berikutnya.
Frekuensi absolut kumulatif dihitung dengan menambah frekuensi kelas saat ini ke total kelas sebelumnya.
Frekuensi relatif kumulatif dihitung dengan membagi frekuensi absolut kumulatif dengan total seluruh observasi.
<slide src="statistik/tabel-kumulatif.png" alt="Tabel Rincian Profit Kumulatif"/>
<slide src="statistik/data-kumulatif.png" alt="Data Frekuensi Kumulatif"/>
<slide src="statistik/ogive-persentase.png" alt="Kurva Ogive Persentase"/>
`;
