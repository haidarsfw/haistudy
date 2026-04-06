export const statistikModule1 = `
<h1>Modul 1: Pengantar Statistika Bisnis & Deskripsi Data</h1>

<h2>Topik 1: Pengantar Statistika Bisnis</h2>

Pengetahuan statistika krusial dalam karir apa pun karena data dikumpulkan di berbagai tempat dan membutuhkan teknik analisis untuk menghasilkan perbandingan yang valid serta memprediksi hasil keputusan bisnis.
<slide src="statistik/data-never-sleeps.png" alt="Infografis Data Never Sleeps"/>
Statistika didefinisikan sebagai ilmu pengumpulan, pengorganisasian, penyajian, analisis, dan interpretasi data guna memfasilitasi pengambilan keputusan yang efektif.
<b>Contoh praktis:</b> Analisis perbandingan tingkat inflasi tahun berjalan sebesar 5.4% dengan periode sebelumnya.

<h3>Jenis Statistika</h3>
<bullet><b>Statistika Deskriptif:</b> Berfungsi mengatur, meringkas, dan menyajikan data agar mudah dipahami. Contoh: Peringkasan total 46.837 mil jalan raya antarnegara bagian.</bullet>
<bullet><b>Statistika Inferensial:</b> Bertujuan mengestimasi properti atau karakteristik dari sebuah populasi dengan menggunakan sampel acak. Contoh: Pengambilan sampel acak untuk mengestimasi proporsi individu yang belum mendapat vaksin COVID-19.</bullet>

<h3>Populasi dan Sampel</h3>
<slide src="statistik/populasi-sampel.png" alt="Diagram Populasi dan Sampel"/>
<bullet><b>Populasi:</b> Total individu atau seluruh objek pengamatan yang menjadi ketertarikan penelitian.</bullet>
<bullet><b>Sampel:</b> Sebagian dari populasi yang diambil untuk keperluan analisis.</bullet>

<h3>Jenis Variabel</h3>
<slide src="statistik/types-of-variables.png" alt="Bagan Types of Variables"/>
<bullet><b>Kualitatif:</b> Atribut non-numerik berdasarkan observasi karakteristik. Contoh: Jenis kelamin atau warna rambut.</bullet>
<bullet><b>Kuantitatif:</b> Nilai numerik yang terbagi atas dua kategori dasar:</bullet>
<bullet><b>Diskret:</b> Hasil penghitungan yang memiliki jarak atau celah antar nilainya. Contoh: Jumlah kamar di sebuah rumah.</bullet>
<bullet><b>Kontinu:</b> Hasil pengukuran berkelanjutan tanpa jeda dalam rentang spesifik. Contoh: Durasi waktu tempuh penerbangan sebesar 5.25 jam.</bullet>

<h3>Tingkat Pengukuran</h3>
<slide src="statistik/levels-of-measurement.png" alt="Bagan Levels of Measurement"/>
Tingkat ini secara langsung mendikte jenis analisis statistik yang paling tepat digunakan.
<bullet><b>Nominal:</b> Tingkat dasar berbentuk label tanpa pengurutan khusus dan hanya berfungsi sebagai klasifikasi atau hitungan. Contoh: Klasifikasi warna M&M.</bullet>
<bullet><b>Ordinal:</b> Data berbentuk peringkat atau rating berdasarkan variabel kualitatif tertentu. Contoh: Pemeringkatan sepuluh negara bagian dengan iklim bisnis terbaik.</bullet>
<bullet><b>Interval:</b> Memiliki fungsi ordinal, jarak antar nilai pasti bermakna, dan ketiadaan titik nol mutlak. Contoh: Skala ukur temperatur Fahrenheit.</bullet>
<bullet><b>Rasio:</b> Tingkat tertinggi dengan interpretasi jarak bermakna dan kehadiran titik nol absolut yang merepresentasikan ketiadaan variabel tersebut. Contoh: Jumlah upah karyawan.</bullet>

<h3>Etika dan Analitik Bisnis</h3>
Praktek ilmu statistika wajib dijalankan dengan integritas, kejujuran, dan perspektif independen. Analis harus berani mempertanyakan laporan bias atau sampel tidak representatif.
Bisnis analitik menyatukan konsep statistik dengan perangkat lunak komputer modern untuk membangun cerita dan mendukung narasi empiris di lingkungan korporasi.
<slide src="statistik/excel-profit-otomotif.png" alt="Tabel Data Excel Profit Otomotif"/>

<h2>Topik 2: Deskripsi Data, Distribusi Frekuensi, dan Penyajian Visual</h2>

<h3>Konstruksi Tabel Frekuensi Data Kualitatif</h3>
Pengelompokan data kualitatif membutuhkan penetapan kelas bersifat <b>mutually exclusive</b> (satu nilai hanya pada satu kelas spesifik) dan <b>collectively exhaustive</b> (setiap nilai memiliki kelas penampung).
Proses penyusunannya melalui penyortiran kelas dan perhitungan jumlah observasi per kelas untuk dijadikan frekuensi dasar.
Frekuensi relatif adalah fraksi perhitungan per kelas dibagi total seluruh observasi. Contoh: Total 52 mobil di Kane dari batas keseluruhan 180 mobil menghasilkan frekuensi relatif sebesar 0.289.
<slide src="statistik/frekuensi-tabel-penjualan.png" alt="Tabel Data Penjualan Mobil Harian"/>
<slide src="statistik/frekuensi-relatif-perhitungan.png" alt="Perhitungan Frekuensi Relatif Penjualan Mobil"/>

<h3>Visualisasi Variabel Kualitatif</h3>
<bullet><b>Bar Chart:</b> Diagram batang klasik di mana sumbu horizontal mendeskripsikan tipe kualitatif sedangkan tinggi balok persegi vertikal menunjukkan jumlah kelas frekuensi. Aturan pengurutan tidak berlaku untuk variabel nominal, dan bar dengan frekuensi absolut terbanyak disebut <b>Modus</b>.</bullet>
<slide src="statistik/bar-chart.png" alt="Contoh Bar Chart Penjualan Mobil"/>
<slide src="statistik/bar-chart-pengurutan.png" alt="Pengurutan Variasi Nominal Bar Chart"/>
<bullet><b>Pie Chart:</b> Visual berupa irisan yang menyajikan persentase spesifik dari total frekuensi utuh di setiap kelas.</bullet>
<slide src="statistik/pie-chart-kendaraan.png" alt="Pie Chart Persentase Kendaraan"/>

<h3>Distribusi Frekuensi Data Kuantitatif</h3>
Merupakan klasifikasi angka observasi kuantitatif dalam format <b>mutually exclusive</b> dan <b>collectively exhaustive</b> melalui 4 fase baku.
<slide src="statistik/dataset-mentah-180.png" alt="180 Dataset Mentah Profit Otomotif"/>
<slide src="statistik/formula-batas-kelas.png" alt="Formula Batas Kelas dan Persentase"/>
Penetapan kelas sasaran dihitung dari rumusan $2^k > n$. Contoh: Observasi total $n=180$ membutuhkan 8 kelas ($k=8$) agar ekuivalensinya relevan.
<slide src="statistik/penentuan-jumlah-kelas.png" alt="Penentuan Jumlah Kelas: 2^k > n"/>
Penetapan lebar interval seragam disesuaikan dengan rumus $i \\ge (Maksimum - Minimum) / k$. Contoh: Hasil selisih batas maksimal profit dengan minimum dibagi 8 menghasilkan interval bernilai $400.
<slide src="statistik/penentuan-interval.png" alt="Penentuan Lebar Interval Kelas"/>
Penyusunan limit dan titik ekstrem batas tiap kelas di dalam tabel.
<slide src="statistik/limit-batas-kelas.png" alt="Penyusunan Limit Batas Tiap Kelas"/>
Pencatatan frekuensi observasi di setiap rentang kelas dan pembagian frekuensi relatif.
<slide src="statistik/frekuensi-per-kelas.png" alt="Frekuensi Observasi Per Kelas"/>
<slide src="statistik/frekuensi-relatif-per-kelas.png" alt="Frekuensi Relatif Per Kelas"/>

<h3>Penyajian Grafik Data Kuantitatif</h3>
<bullet><b>Histogram:</b> Struktur balok yang dirapatkan tegak lurus secara terintegrasi untuk mendemonstrasikan spektrum batas distribusi angka pada sumbu horizontal dan level frekuensi mutlak sumbu vertikal.</bullet>
<slide src="statistik/histogram-profit.png" alt="Histogram Profit $200-$3400"/>
<bullet><b>Frequency Polygon:</b> Garis kontinyu pengidentifikasi pola distribusi pusat antar area tengah interval kelas. Kurva ini memberikan representasi profil data paling efektif apabila dimanfaatkan dalam sesi analisis perbandingan antar beragam kelompok objek pengamatan.</bullet>
<slide src="statistik/frequency-polygon.png" alt="Frequency Polygon Profit"/>
<slide src="statistik/polygon-perbandingan.png" alt="Polygon Perbandingan Fowler Motors vs Applewood"/>

<h3>Distribusi Kumulatif</h3>
Distribusi kumulatif berfungsi melihat akumulasi data saat bergeser ke bawah kelas interval.
Pendekatan frekuensi absolut disusun dengan mengeksekusi penambahan jumlah kelas eksisting dengan kumpulan kuantitas kelas terdahulu.
Frekuensi relatif kumulatif diperoleh dari pembagian kalkulasi absolut kumulatif dengan gabungan seluruh objek.
<slide src="statistik/tabel-kumulatif.png" alt="Tabel Rincian Profit Kumulatif"/>
<slide src="statistik/data-kumulatif.png" alt="Data Frekuensi Kumulatif"/>
<slide src="statistik/ogive-persentase.png" alt="Kurva Ogive Persentase"/>
`;
