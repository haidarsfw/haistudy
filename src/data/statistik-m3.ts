export const statistikModule3 = `
<h1>Modul 3: Distribusi Probabilitas Kontinu & Diskrit</h1>

<h2>Topik 5: Distribusi Probabilitas Diskrit (Sesi 7)</h2>

Variabel acak adalah nilai numerik hasil pengamatan suatu eksperimen. Variabel acak diskrit hanya bisa bernilai angka-angka yang terpisah dengan jelas (hasil hitungan), sedangkan variabel acak kontinu bisa bernilai pecahan atau desimal dalam satu rentang (hasil pengukuran). Distribusi probabilitas mendaftar semua hasil eksperimen beserta peluang tiap hasilnya.

<h3>Mean, Varians, dan Standar Deviasi Distribusi Diskrit</h3>
<bullet><b>Mean (Nilai Harapan):</b> Ukuran pusat data berdasarkan bobot peluang: $\\mu = \\Sigma [x \\cdot P(x)]$.</bullet>
<bullet><b>Varians:</b> Ukuran sebaran nilai dari rata-ratanya: $\\sigma^2 = \\Sigma [(x - \\mu)^2 \\cdot P(x)]$.</bullet>
<slide src="statistik/m3-varians-distribusi.png" alt="Rumus Varians Distribusi Probabilitas"/>
<bullet><b>Standar Deviasi:</b> Akar dari varians ($\\sigma = \\sqrt{\\sigma^2}$).</bullet>
Contoh: Menentukan rata-rata jumlah kendaraan terjual per hari dari riwayat penjualan masa lalu.

<h3>Distribusi Binomial</h3>
Dipakai untuk kejadian dengan syarat ketat: eksperimen diulang sebanyak $n$ kali (tetap), tiap percobaan independen, tiap percobaan punya dua hasil saja (sukses/gagal), dan peluang sukses ($\\pi$) tetap sama di semua percobaan.
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{n!}{x!(n-x)!} \\pi^x (1-\\pi)^{n-x}$.</bullet>
<slide src="statistik/m3-distribusi-binomial.png" alt="Rumus Distribusi Binomial"/>
<bullet><b>Mean & Varians:</b> $\\mu = n\\pi$ dan $\\sigma^2 = n\\pi(1-\\pi)$.</bullet>
Contoh: Peluang dapat tepat 3 pembeli dari 10 panggilan telemarketing dengan tingkat konversi tetap 20%.

<h3>Distribusi Hipergeometrik</h3>
Mirip binomial karena hanya punya dua hasil mutually exclusive, tapi dipakai saat sampel diambil dari populasi terbatas <b>tanpa pengembalian</b> (without replacement). Peluang sukses berubah tiap kali kita ambil sampel.
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{(^S C_x)(^{N-S} C_{n-x})}{^N C_n}$.</bullet>
<slide src="statistik/m3-distribusi-hipergeometrik.png" alt="Rumus Distribusi Hipergeometrik"/>
Contoh: Mengambil 4 kartu acak untuk mendapat 2 kartu As dari dek 52 kartu tanpa dikembalikan.

<h3>Distribusi Poisson</h3>
Menghitung berapa kali kejadian sukses muncul dalam satu interval kontinu tertentu (rentang waktu, luas wilayah, atau jarak). Peluangnya proporsional dengan besar interval, dan tiap kejadian independen.
<bullet><b>Rumus Utama:</b> $P(x) = \\frac{\\mu^x e^{-\\mu}}{x!}$.</bullet>
<slide src="statistik/m3-distribusi-poisson.png" alt="Rumus Distribusi Poisson"/>
Contoh: Menghitung peluang tepat 5 nasabah datang ke bank dalam satu jam.

<h2>Topik 6: Distribusi Probabilitas Kontinu (Sesi 5-6)</h2>

<h3>Distribusi Seragam (Uniform Distribution)</h3>
Kondisi di mana variabel kontinu punya kurva berbentuk persegi panjang lurus, karena semua rentang nilai di dalam interval observasi punya peluang terjadi yang sama persis.
<bullet><b>Mean & Standar Deviasi:</b> $\\mu = \\frac{a+b}{2}$ dan $\\sigma = \\sqrt{\\frac{(b-a)^2}{12}}$.</bullet>
<bullet><b>Area Probabilitas:</b> $P(x) = \\frac{1}{b-a}$ untuk $a \\le x \\le b$.</bullet>
<slide src="statistik/m3-distribusi-seragam.png" alt="Kurva Distribusi Seragam"/>
Contoh: Peluang waktu tunggu bus yang selalu merata di rentang 10 sampai 20 menit.

<h3>Distribusi Normal</h3>
Konsep paling penting di statistik untuk variabel kontinu. Bentuknya kurva lonceng yang simetris di pusatnya (Mean = Median = Mode), ekor kurvanya memanjang tanpa pernah menyentuh sumbu X (asimtotik), dan luas total di bawah kurvanya pasti 1.
<slide src="statistik/m3-distribusi-normal.png" alt="Karakteristik Distribusi Normal"/>

<h3>Distribusi Normal Standar (Z-Distribution)</h3>
Karena ada tak terhingga kurva normal yang dipengaruhi mean dan varians masing-masing, semua distribusi normal diubah ke satu distribusi baku dengan Mean = 0 dan Standar Deviasi = 1.
<bullet><b>Rumus Nilai Z:</b> $z = \\frac{x - \\mu}{\\sigma}$. Nilai ini menunjukkan berapa standar deviasi suatu nilai dari rata-rata aslinya.</bullet>
<slide src="statistik/m3-tabel-z.png" alt="Tabel Distribusi Normal Standar (Tabel Z)"/>
Contoh: Mengukur posisi hasil ujian masuk seorang siswa dibanding populasi umum.

<h3>Aturan Empiris Area Normal</h3>
Aturan baku untuk menafsir persentase kurva lonceng secara praktis.
<slide src="statistik/m3-aturan-empiris.png" alt="Area di Bawah Kurva Normal / Aturan Empiris"/>
<bullet><b>Area</b> $\\mu \\pm 1\\sigma$ mencakup sekitar <b>68.26%</b> data.</bullet>
<bullet><b>Area</b> $\\mu \\pm 2\\sigma$ mencakup sekitar <b>95.44%</b> data.</bullet>
<bullet><b>Area</b> $\\mu \\pm 3\\sigma$ mencakup sekitar <b>99.74%</b> data.</bullet>

<h3>Aproksimasi Normal terhadap Binomial</h3>
Distribusi binomial (yang diskrit) bisa didekati pakai Distribusi Normal kalau sampelnya besar dan simetris. Syaratnya: $n\\pi \\ge 5$ dan $n(1-\\pi) \\ge 5$.
<bullet><b>Faktor Koreksi Kontinuitas:</b> Tambah atau kurangi $\\pm 0.5$ untuk mengubah titik diskrit tunggal jadi area luasan kontinu di kurva.</bullet>

<h3>Distribusi Eksponensial</h3>
Menghitung peluang jeda waktu antara dua kejadian berurutan. Ini adalah pasangan kontinu dari distribusi Poisson yang diskrit.
<bullet><b>Rumus Utama:</b> $P(x) = \\lambda e^{-\\lambda x}$.</bullet>
<slide src="statistik/m3-distribusi-eksponensial.png" alt="Kurva Distribusi Eksponensial"/>
Contoh: Menghitung jeda waktu kedatangan unit produk cacat di meja inspeksi pabrik.
`;
