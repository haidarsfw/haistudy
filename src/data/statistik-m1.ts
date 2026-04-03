export const statistikModule1 = `
<h1>Modul 1: Pengantar Statistika Bisnis & Deskripsi Data</h1>

<h2>Topik 1: Pengantar Statistika Bisnis</h2>

<h3>Definisi Statistika</h3>
<bullet>Pengetahuan statistika krusial dalam karir apa pun karena data dikumpulkan di berbagai tempat dan membutuhkan teknik analisis untuk menghasilkan perbandingan yang valid serta memprediksi hasil keputusan bisnis.</bullet>
<bullet>Statistika didefinisikan sebagai ilmu pengumpulan, pengorganisasian, penyajian, analisis, dan interpretasi data guna memfasilitasi pengambilan keputusan yang efektif.</bullet>
<bullet><b>Contoh praktis:</b> Analisis perbandingan tingkat inflasi tahun berjalan sebesar 5.4% dengan periode sebelumnya.</bullet>

<h3>Jenis Statistika</h3>
<bullet><b>Statistika Deskriptif:</b> Berfungsi mengatur, meringkas, dan menyajikan data agar mudah dipahami. Contoh: Peringkasan total 46.837 mil jalan raya antarnegara bagian.</bullet>
<bullet><b>Statistika Inferensial:</b> Bertujuan mengestimasi properti atau karakteristik dari sebuah populasi dengan menggunakan sampel acak. Contoh: Pengambilan sampel acak untuk mengestimasi proporsi individu yang belum mendapat vaksin COVID-19.</bullet>

<h3>Populasi dan Sampel</h3>
<bullet><b>Populasi:</b> Total individu atau seluruh objek pengamatan yang menjadi ketertarikan penelitian.</bullet>
<bullet><b>Sampel:</b> Sebagian dari populasi yang diambil untuk keperluan analisis.</bullet>

<h3>Jenis Variabel</h3>
<bullet><b>Kualitatif:</b> Atribut non-numerik berdasarkan observasi karakteristik. Contoh: Jenis kelamin atau warna rambut.</bullet>
<bullet><b>Kuantitatif:</b> Nilai numerik yang terbagi atas dua kategori dasar:</bullet>
<bullet><b>Diskret:</b> Hasil penghitungan yang memiliki jarak atau celah antar nilainya. Contoh: Jumlah kamar di sebuah rumah.</bullet>
<bullet><b>Kontinu:</b> Hasil pengukuran berkelanjutan tanpa jeda dalam rentang spesifik. Contoh: Durasi waktu tempuh penerbangan sebesar 5.25 jam.</bullet>

<h3>Tingkat Pengukuran</h3>
<bullet>Tingkat ini secara langsung mendikte jenis analisis statistik yang paling tepat digunakan.</bullet>
<bullet><b>Nominal:</b> Tingkat dasar berbentuk label tanpa pengurutan khusus dan hanya berfungsi sebagai klasifikasi atau hitungan. Contoh: Klasifikasi warna M&M.</bullet>
<bullet><b>Ordinal:</b> Data berbentuk peringkat atau rating berdasarkan variabel kualitatif tertentu. Contoh: Pemeringkatan sepuluh negara bagian dengan iklim bisnis terbaik.</bullet>
<bullet><b>Interval:</b> Memiliki fungsi ordinal, jarak antar nilai pasti bermakna, dan ketiadaan titik nol mutlak. Contoh: Skala ukur temperatur Fahrenheit.</bullet>
<bullet><b>Rasio:</b> Tingkat tertinggi dengan interpretasi jarak bermakna dan kehadiran titik nol absolut yang merepresentasikan ketiadaan variabel tersebut. Contoh: Jumlah upah karyawan.</bullet>

<h3>Etika dan Analitik Bisnis</h3>
<bullet>Praktek ilmu statistika wajib dijalankan dengan integritas, kejujuran, dan perspektif independen. Analis harus berani mempertanyakan laporan bias atau sampel tidak representatif.</bullet>
<bullet>Bisnis analitik menyatukan konsep statistik dengan perangkat lunak komputer modern untuk membangun cerita dan mendukung narasi empiris di lingkungan korporasi.</bullet>

<h2>Topik 2: Deskripsi Data, Distribusi Frekuensi, dan Penyajian Visual</h2>

<h3>Konstruksi Tabel Frekuensi Data Kualitatif</h3>
<bullet>Pengelompokan data kualitatif membutuhkan penetapan kelas bersifat <b>mutually exclusive</b> (satu nilai hanya pada satu kelas spesifik) dan <b>collectively exhaustive</b> (setiap nilai memiliki kelas penampung).</bullet>
<bullet>Proses penyusunannya melalui penyortiran kelas dan perhitungan jumlah observasi per kelas untuk dijadikan frekuensi dasar.</bullet>
<bullet><b>Frekuensi Relatif</b> adalah fraksi perhitungan per kelas dibagi total seluruh observasi. Contoh: Total 52 mobil di Kane dari batas keseluruhan 180 mobil menghasilkan frekuensi relatif sebesar 0.289.</bullet>

<h3>Visualisasi Variabel Kualitatif</h3>
<bullet><b>Bar Chart:</b> Diagram batang klasik di mana sumbu horizontal mendeskripsikan tipe kualitatif sedangkan tinggi balok persegi vertikal menunjukkan jumlah kelas frekuensi. Aturan pengurutan tidak berlaku untuk variabel nominal, dan bar dengan frekuensi absolut terbanyak disebut <b>Modus</b>.</bullet>
<bullet><b>Pie Chart:</b> Visual berupa irisan yang menyajikan persentase spesifik dari total frekuensi utuh di setiap kelas.</bullet>

<h3>Distribusi Frekuensi Data Kuantitatif</h3>
<bullet>Merupakan klasifikasi angka observasi kuantitatif dalam format mutually exclusive dan collectively exhaustive melalui 4 fase baku:</bullet>
<bullet><b>1. Penetapan jumlah kelas:</b> Dihitung dari rumusan $2^k > n$. Contoh: Observasi total $n = 180$ membutuhkan 8 kelas ($k = 8$) agar $2^8 = 256 > 180$.</bullet>
<bullet><b>2. Penetapan lebar interval:</b> Disesuaikan dengan rumus $i \\ge \\frac{\\text{Maksimum} - \\text{Minimum}}{k}$. Contoh: Selisih batas maksimal profit dengan minimum dibagi 8 menghasilkan interval bernilai $400.</bullet>
<bullet><b>3. Penyusunan limit:</b> Penyusunan limit dan titik ekstrem batas tiap kelas di dalam tabel.</bullet>
<bullet><b>4. Pencatatan frekuensi:</b> Pencatatan frekuensi observasi di setiap rentang kelas dan pembagian frekuensi relatif.</bullet>

<h3>Penyajian Grafik Data Kuantitatif</h3>
<bullet><b>Histogram:</b> Struktur balok yang dirapatkan tegak lurus secara terintegrasi untuk mendemonstrasikan spektrum batas distribusi angka pada sumbu horizontal dan level frekuensi mutlak sumbu vertikal.</bullet>
<bullet><b>Frequency Polygon:</b> Garis kontinyu pengidentifikasi pola distribusi pusat antar area tengah interval kelas. Kurva ini memberikan representasi profil data paling efektif apabila dimanfaatkan dalam sesi analisis perbandingan antar beragam kelompok objek pengamatan.</bullet>

<h3>Distribusi Kumulatif</h3>
<bullet>Distribusi kumulatif berfungsi melihat akumulasi data saat bergeser ke bawah kelas interval.</bullet>
<bullet>Pendekatan frekuensi absolut disusun dengan mengeksekusi penambahan jumlah kelas eksisting dengan kumpulan kuantitas kelas terdahulu.</bullet>
<bullet>Frekuensi relatif kumulatif diperoleh dari pembagian kalkulasi absolut kumulatif dengan gabungan seluruh objek.</bullet>
`;
