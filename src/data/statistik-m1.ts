export const statistikModule1 = `
<h1>Modul 1: Pengantar Statistika Bisnis & Deskripsi Data</h1>

<h2>Topik 1: Pengantar Statistika Bisnis</h2>

Pengetahuan statistika krusial dalam karir apa pun karena data dikumpulkan di berbagai tempat dan membutuhkan teknik analisis untuk menghasilkan perbandingan yang valid serta memprediksi hasil keputusan bisnis. (lihat materi sesi 1, slide 3 untuk infografis Data Never Sleeps).
Statistika didefinisikan sebagai ilmu pengumpulan, pengorganisasian, penyajian, analisis, dan interpretasi data guna memfasilitasi pengambilan keputusan yang efektif.
<b>Contoh praktis:</b> Analisis perbandingan tingkat inflasi tahun berjalan sebesar 5.4% dengan periode sebelumnya.

<h3>Jenis Statistika</h3>
<bullet><b>Statistika Deskriptif:</b> Berfungsi mengatur, meringkas, dan menyajikan data agar mudah dipahami. Contoh: Peringkasan total 46.837 mil jalan raya antarnegara bagian.</bullet>
<bullet><b>Statistika Inferensial:</b> Bertujuan mengestimasi properti atau karakteristik dari sebuah populasi dengan menggunakan sampel acak. Contoh: Pengambilan sampel acak untuk mengestimasi proporsi individu yang belum mendapat vaksin COVID-19.</bullet>

<h3>Populasi dan Sampel (lihat materi sesi 1, slide 7 untuk diagram visual Populasi dan Sampel)</h3>
<bullet><b>Populasi:</b> Total individu atau seluruh objek pengamatan yang menjadi ketertarikan penelitian.</bullet>
<bullet><b>Sampel:</b> Sebagian dari populasi yang diambil untuk keperluan analisis.</bullet>

<h3>Jenis Variabel (lihat materi sesi 1, slide 9 untuk bagan Types of Variables)</h3>
<bullet><b>Kualitatif:</b> Atribut non-numerik berdasarkan observasi karakteristik. Contoh: Jenis kelamin atau warna rambut.</bullet>
<bullet><b>Kuantitatif:</b> Nilai numerik yang terbagi atas dua kategori dasar:</bullet>
<bullet><b>Diskret:</b> Hasil penghitungan yang memiliki jarak atau celah antar nilainya. Contoh: Jumlah kamar di sebuah rumah.</bullet>
<bullet><b>Kontinu:</b> Hasil pengukuran berkelanjutan tanpa jeda dalam rentang spesifik. Contoh: Durasi waktu tempuh penerbangan sebesar 5.25 jam.</bullet>

<h3>Tingkat Pengukuran (lihat materi sesi 1, slide 12 untuk bagan Levels of Measurement)</h3>
Tingkat ini secara langsung mendikte jenis analisis statistik yang paling tepat digunakan.
<bullet><b>Nominal:</b> Tingkat dasar berbentuk label tanpa pengurutan khusus dan hanya berfungsi sebagai klasifikasi atau hitungan. Contoh: Klasifikasi warna M&M.</bullet>
<bullet><b>Ordinal:</b> Data berbentuk peringkat atau rating berdasarkan variabel kualitatif tertentu. Contoh: Pemeringkatan sepuluh negara bagian dengan iklim bisnis terbaik.</bullet>
<bullet><b>Interval:</b> Memiliki fungsi ordinal, jarak antar nilai pasti bermakna, dan ketiadaan titik nol mutlak. Contoh: Skala ukur temperatur Fahrenheit.</bullet>
<bullet><b>Rasio:</b> Tingkat tertinggi dengan interpretasi jarak bermakna dan kehadiran titik nol absolut yang merepresentasikan ketiadaan variabel tersebut. Contoh: Jumlah upah karyawan.</bullet>

<h3>Etika dan Analitik Bisnis</h3>
Praktek ilmu statistika wajib dijalankan dengan integritas, kejujuran, dan perspektif independen. Analis harus berani mempertanyakan laporan bias atau sampel tidak representatif.
Bisnis analitik menyatukan konsep statistik dengan perangkat lunak komputer modern untuk membangun cerita dan mendukung narasi empiris di lingkungan korporasi. (lihat materi sesi 1, slide 16 untuk tabel data Excel profit otomotif).

<h2>Topik 2: Deskripsi Data, Distribusi Frekuensi, dan Penyajian Visual</h2>

<h3>Konstruksi Tabel Frekuensi Data Kualitatif</h3>
Pengelompokan data kualitatif membutuhkan penetapan kelas bersifat <b>mutually exclusive</b> (satu nilai hanya pada satu kelas spesifik) dan <b>collectively exhaustive</b> (setiap nilai memiliki kelas penampung).
Proses penyusunannya melalui penyortiran kelas dan perhitungan jumlah observasi per kelas untuk dijadikan frekuensi dasar.
Frekuensi relatif adalah fraksi perhitungan per kelas dibagi total seluruh observasi. (lihat materi sesi 2, slide 4 dan 5 untuk tabel data dan perhitungan frekuensi relatif penjualan mobil harian). Contoh: Total 52 mobil di Kane dari batas keseluruhan 180 mobil menghasilkan frekuensi relatif sebesar 0.289.

<h3>Visualisasi Variabel Kualitatif</h3>
<bullet><b>Bar Chart:</b> Diagram batang klasik di mana sumbu horizontal mendeskripsikan tipe kualitatif sedangkan tinggi balok persegi vertikal menunjukkan jumlah kelas frekuensi. Aturan pengurutan tidak berlaku untuk variabel nominal, dan bar dengan frekuensi absolut terbanyak disebut <b>Modus</b>. (lihat materi sesi 2, slide 7 dan 8 untuk contoh grafik Bar Chart dan pengurutan variasi nominal).</bullet>
<bullet><b>Pie Chart:</b> Visual berupa irisan yang menyajikan persentase spesifik dari total frekuensi utuh di setiap kelas. (lihat materi sesi 2, slide 9 untuk visualisasi Pie Chart persentase kendaraan).</bullet>

<h3>Distribusi Frekuensi Data Kuantitatif</h3>
Merupakan klasifikasi angka observasi kuantitatif dalam format <b>mutually exclusive</b> dan <b>collectively exhaustive</b> melalui 4 fase baku. (lihat materi sesi 2, slide 11-15 untuk tabel 180 dataset mentah, formula batas kelas, hingga hasil akhir persentase).
Penetapan kelas sasaran dihitung dari rumusan $2^k > n$. Contoh: Observasi total $n=180$ membutuhkan 8 kelas ($k=8$) agar ekuivalensinya relevan.
Penetapan lebar interval seragam disesuaikan dengan rumus $i \\ge (Maksimum - Minimum) / k$. Contoh: Hasil selisih batas maksimal profit dengan minimum dibagi 8 menghasilkan interval bernilai $400.
Penyusunan limit dan titik ekstrem batas tiap kelas di dalam tabel.
Pencatatan frekuensi observasi di setiap rentang kelas dan pembagian frekuensi relatif.

<h3>Penyajian Grafik Data Kuantitatif</h3>
<bullet><b>Histogram:</b> Struktur balok yang dirapatkan tegak lurus secara terintegrasi untuk mendemonstrasikan spektrum batas distribusi angka pada sumbu horizontal dan level frekuensi mutlak sumbu vertikal. (lihat materi sesi 2, slide 17 untuk bentuk visual Histogram Profit $200-$3400).</bullet>
<bullet><b>Frequency Polygon:</b> Garis kontinyu pengidentifikasi pola distribusi pusat antar area tengah interval kelas. Kurva ini memberikan representasi profil data paling efektif apabila dimanfaatkan dalam sesi analisis perbandingan antar beragam kelompok objek pengamatan. (lihat materi sesi 2, slide 20 dan 21 untuk visualisasi Polygon tunggal dan skema Poligon perbandingan Fowler Motors vs Applewood).</bullet>

<h3>Distribusi Kumulatif</h3>
Distribusi kumulatif berfungsi melihat akumulasi data saat bergeser ke bawah kelas interval.
Pendekatan frekuensi absolut disusun dengan mengeksekusi penambahan jumlah kelas eksisting dengan kumpulan kuantitas kelas terdahulu.
Frekuensi relatif kumulatif diperoleh dari pembagian kalkulasi absolut kumulatif dengan gabungan seluruh objek. (lihat materi sesi 2, slide 24 dan 25 untuk tabel rincian penambahan profit kumulatif dan kurva visualisasi tren Ogive persentase).
`;
