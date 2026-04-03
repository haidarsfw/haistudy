export const statistikModule3 = `
<h1>Modul 3: Distribusi Probabilitas Kontinu & Diskrit</h1>

<h2>Topik 5: Distribusi Probabilitas Diskrit (Sesi 7)</h2>

<h3>Variabel Acak</h3>
<bullet>Variabel acak adalah kuantitas numerik hasil pengamatan suatu eksperimen.</bullet>
<bullet><b>Variabel acak diskrit:</b> Hanya dapat mengasumsikan nilai-nilai yang terpisah dengan celah yang jelas (berbasis penghitungan).</bullet>
<bullet><b>Variabel acak kontinu:</b> Mengasumsikan fraksi atau desimal tanpa batas dalam suatu rentang (berbasis pengukuran).</bullet>
<bullet>Distribusi probabilitas mendata seluruh hasil eksperimen variabel beserta peluang terjadinya tiap hasil tersebut.</bullet>

<h3>Mean, Varians, dan Standar Deviasi Distribusi Diskrit</h3>
<bullet><b>Mean (Nilai Harapan):</b> Mengukur lokasi sentral data berdasarkan bobot peluang: $\\mu = \\Sigma [x \\cdot P(x)]$</bullet>
<bullet><b>Varians:</b> Mengukur dispersi penyebaran nilai dari rata-ratanya: $\\sigma^2 = \\Sigma [(x - \\mu)^2 \\cdot P(x)]$</bullet>
<bullet><b>Standar Deviasi:</b> Akar dari varians: $\\sigma = \\sqrt{\\sigma^2}$</bullet>
<bullet>Contoh: Penentuan ekspektasi rata-rata jumlah kendaraan terjual per hari berdasar frekuensi riwayat penjualan masa lalu.</bullet>

<h3>Distribusi Binomial</h3>
<bullet>Mengkalkulasi kejadian dengan karakteristik ketat: eksperimen memiliki batas pengulangan ($n$) yang tetap, percobaan bersifat independen, hanya memiliki dua klasifikasi hasil saling eksklusif (sukses/gagal), dan probabilitas sukses ($\\pi$) konstan dari satu percobaan ke percobaan lain.</bullet>
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{n!}{x!(n-x)!} \\pi^x (1-\\pi)^{n-x}$</bullet>
<bullet><b>Mean & Varians Binomial:</b> $\\mu = n\\pi$ dan $\\sigma^2 = n\\pi(1-\\pi)$</bullet>
<bullet>Contoh: Peluang mendapat tepat 3 pembeli dari 10 panggilan telemarketing yang memiliki tingkat konversi tetap 20%.</bullet>

<h3>Distribusi Hipergeometrik</h3>
<bullet>Serupa dengan binomial karena berfokus pada dua hasil mutually exclusive, namun diaplikasikan saat sampel ditarik dari populasi terbatas <b>tanpa pengembalian</b> (without replacement). Probabilitas kesuksesan berubah secara dinamis pada tiap tahap penarikan sampel.</bullet>
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{\\binom{S}{x} \\binom{N-S}{n-x}}{\\binom{N}{n}}$</bullet>
<bullet>Contoh: Penarikan 4 kartu secara acak untuk mendapatkan spesifik 2 kartu as dari total 52 dek kartu standar tanpa dikembalikan.</bullet>

<h3>Distribusi Poisson</h3>
<bullet>Mengukur jumlah kemunculan kejadian sukses di dalam batasan interval kontinu spesifik (seperti rentang waktu, luas wilayah, panjang jarak). Probabilitas selalu proporsional dengan besaran interval dan kemunculan kejadian bersifat independen.</bullet>
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{\\mu^x e^{-\\mu}}{x!}$</bullet>
<bullet>Contoh: Penghitungan peluang kedatangan tepat 5 nasabah di gerai bank pada interval waktu satu jam.</bullet>

<h2>Topik 6: Distribusi Probabilitas Kontinu (Sesi 5-6)</h2>

<h3>Distribusi Seragam (Uniform Distribution)</h3>
<bullet>Kondisi di mana variabel kontinu memiliki bentuk kurva persegi panjang lurus tegak, karena setiap rentang nilai di dalam interval observasi memiliki ekspektasi peluang kejadian yang benar-benar identik.</bullet>
<bullet><b>Mean:</b> $\\mu = \\frac{a+b}{2}$</bullet>
<bullet><b>Standar Deviasi:</b> $\\sigma = \\sqrt{\\frac{(b-a)^2}{12}}$</bullet>
<bullet><b>Area Probabilitas:</b> $P(x) = \\frac{1}{b-a}$ untuk syarat $a \\le x \\le b$</bullet>
<bullet>Contoh: Peluang waktu tunggu kedatangan bus yang selalu pasti merata di rentang 10 hingga 20 menit.</bullet>

<h3>Distribusi Normal</h3>
<bullet>Konsep terpenting dalam statistik untuk variabel kontinu. Berwujud kurva lonceng yang sepenuhnya simetris sempurna di poros tengah pusat (titik Mean = Median = Mode), ekor lengkungan menjulur tak terbatas tanpa menyentuh sumbu X (asimtotik), dan memiliki luasan area mutlak bernilai 1.</bullet>

<h3>Distribusi Normal Standar (Z-Distribution)</h3>
<bullet>Karena terdapat probabilitas normal tanpa batas yang dipengaruhi variabel rata-rata dan varians mandiri, seluruh distribusi normal diterjemahkan ke dalam satu distribusi baku universal berfokus pada Mean = 0 dan Standar Deviasi = 1.</bullet>
<bullet><b>Rumus Nilai Z:</b> $z = \\frac{x - \\mu}{\\sigma}$</bullet>
<bullet>Nilai ini mengekspresikan total jarak standar deviasi di atas atau di bawah rata-rata asli variabel tersebut.</bullet>
<bullet>Contoh: Pengukuran posisi jarak rata-rata hasil ujian masuk seorang siswa berdasar standar populasi umum.</bullet>

<h3>Aturan Empiris Area Normal</h3>
<bullet>Aturan baku untuk penafsiran praktis persentase kurva berdistribusi lonceng:</bullet>
<bullet><b>Area</b> $\\mu \\pm 1\\sigma$ melingkupi kisaran <b>68.26%</b> total data.</bullet>
<bullet><b>Area</b> $\\mu \\pm 2\\sigma$ melingkupi kisaran <b>95.44%</b> total data.</bullet>
<bullet><b>Area</b> $\\mu \\pm 3\\sigma$ melingkupi kisaran <b>99.74%</b> total data.</bullet>

<h3>Aproksimasi Normal terhadap Binomial</h3>
<bullet>Distribusi binomial yang merupakan variabel diskrit dapat didekati menggunakan parameter kontinu Distribusi Normal apabila sampel penelitian besar dan simetris, berpedoman pada kaidah minimal $n\\pi \\ge 5$ dan $n(1-\\pi) \\ge 5$.</bullet>
<bullet><b>Faktor Koreksi Kontinuitas:</b> Membutuhkan rekalibrasi batas area nilai $\\pm 0.5$ untuk mengubah titik diskrit tunggal menjadi sebuah area luasan interval kontinu di atas kurva.</bullet>

<h3>Distribusi Eksponensial</h3>
<bullet>Menghitung secara presisi peluang ekspektasi jeda waktu atau kelambatan di antara dua kejadian saling mengikuti. Merupakan penyeimbang kontinu dari distribusi Poisson diskrit.</bullet>
<bullet><b>Rumus Utama:</b> $P(x) = \\lambda e^{-\\lambda x}$</bullet>
<bullet>Contoh: Menghitung laju kelajuan kedatangan unit produk cacat di meja inspeksi pabrik per sekian satuan waktu jeda.</bullet>
`;
