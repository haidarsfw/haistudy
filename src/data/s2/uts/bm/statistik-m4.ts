export const statistikModule4 = `
<h1>Modul 4: Penyempurna & Pendalaman Materi Ekstraktif</h1>

<h2>Konsep Fundamental Statistika & Data</h2>
<bullet><b>Parameter vs Statistik:</b> Angka yang mengukur karakteristik dari seluruh populasi ($\\mu$) disebut <b>Parameter</b>. Angka yang mengukur karakteristik dari sampel ($\\bar{x}$) disebut <b>Statistik</b>.</bullet>
<bullet><b>Volume Data Era Digital:</b> Data di dunia nyata terus membengkak di banyak platform, sehingga butuh validasi statistik yang tepat agar bisa jadi keputusan bisnis. (lihat materi sesi 1, slide 3 untuk infografis Domo soal laju data per menit seperti 856 tayangan Zoom dan 167 juta video TikTok) .</bullet>
<slide src="statistik/m4-data-never-sleeps.png" alt="Infografis Domo Data Never Sleeps 9.0"/>

<h2>Kaidah Rigor Tabel Distribusi Frekuensi</h2>
<bullet><b>Aturan Eksklusivitas:</b> Syarat mutually exclusive menuntut batas kategori yang tegas. Tiap observasi hanya boleh masuk ke satu kelas, tidak boleh tumpang tindih.</bullet>
<bullet><b>Aturan Ekshaustif:</b> Syarat collectively exhaustive mewajibkan tiap nilai observasi punya kelas penampung. Tidak boleh ada data yang tertinggal.</bullet>
<bullet><b>Penentuan Batas Distribusi:</b> Rumus $2^k > n$ dipakai untuk menentukan jumlah kelas yang pas. (lihat materi sesi 2, slide 11 untuk contoh 180 sampel yang butuh 8 kelas karena $2^8 = 256 > 180$) . Interval kelasnya harus seragam, didapat dari pembagian rentang data dengan jumlah kelas, lalu dibulatkan ke atas. (lihat materi sesi 2, slide 12 untuk perhitungan $374.75$ yang dibulatkan jadi kelipatan $400) .</bullet>
<slide src="statistik/m4-penentuan-jumlah-kelas.png" alt="Frequency Distributions: 2^k > n, n=180, k=8"/>
<slide src="statistik/m4-penentuan-interval.png" alt="Frequency Distributions: ($3292-$294)/8 = $374.75, dibulatkan ke $400"/>

<h2>Properti Spesifik Ukuran Numerik</h2>
<bullet><b>Sifat Mutlak Rata-rata:</b> Total deviasi (selisih) tiap nilai dengan rata-rata aritmatikanya pasti sama dengan nol.</bullet>
<bullet><b>Geometric Mean (Tingkat Perubahan):</b> Rasio geometric mean harus ditulis dalam format $1.0 + \\text{perubahan}$ supaya rumusnya tidak gagal saat ada rasio negatif. (lihat materi sesi 3, slide 17 untuk contoh ROI minus 40% yang dikonversi jadi 0.6 agar hitungannya tetap bisa) .</bullet>
<slide src="statistik/m4-geometric-mean-roi.png" alt="Geometric Mean: ROI 30%, 20%, -40%, 200% dengan GM = 1.294"/>
<bullet><b>Geometric Mean (Awal-Akhir):</b> Metode membandingkan titik akhir dan titik awal rentang observasi, pakai akar pangkat sebanyak periode waktu. (lihat materi sesi 3, slide 18 untuk formula $\\sqrt[n]{\\text{Akhir}/\\text{Awal}} - 1$ dan contoh kenaikan upah dari $45.000 ke $100.000) .</bullet>
<slide src="statistik/m4-geometric-mean-formula.png" alt="Formula Geometric Mean: akar pangkat n dari (Akhir/Awal) - 1, contoh $45,000 ke $100,000"/>
<bullet><b>Konstanta Teorema Chebyshev:</b> Proporsi minimum persebaran data bisa dihitung lewat rumus $1 - \\frac{1}{k^2}$. (lihat materi sesi 3, slide 29 untuk contoh $k=2$ yang hasilnya $75\\%$ dan $k=3$ yang hasilnya $88.9\\%$) .</bullet>
<slide src="statistik/m4-chebyshev-theorem.png" alt="Teorema Chebyshev: k=2 menghasilkan 75%, k=3 menghasilkan 88.9%"/>

<h2>Kelengkapan Mekanisme Probabilitas</h2>
<bullet><b>Hukum Bilangan Besar (Law of Large Numbers):</b> Kalau eksperimen diulang sampai ribuan kali, probabilitas empirisnya akan bergerak mendekati probabilitas teoritis yang sebenarnya. (lihat materi sesi 4, slide 12 untuk tabulasi kestabilan frekuensi relatif dari 10 sampai 10.000 kali lemparan) .</bullet>
<slide src="statistik/m4-law-large-numbers-table.png" alt="Tabel Frekuensi Relatif: 1 hingga 10,000 percobaan lemparan koin"/>
<bullet><b>Formula Perkalian Susunan:</b> Jumlah cara menyusun kejadian dari beberapa grup terpisah dihitung pakai rumus perkalian $(m)(n)$. Contoh: Undian "Pick 3" dengan tiga tabung bola menghasilkan tepat $1000$ susunan.</bullet>
<bullet><b>Koreksi Overcounting Kombinasi:</b> Rumus permutasi pada kejadian tanpa urutan akan menghitung susunan yang sama berkali-kali (overcounting). Makanya kita pakai rumus kombinasi yang punya penyebut $r!$ untuk menghilangkan perhitungan ganda. (lihat materi sesi 4, slide 9 untuk peran pembagi faktorial di rumus kombinasi) .</bullet>
<slide src="statistik/m4-combination-formula.png" alt="Rumus Kombinasi: nCr = n! / r!(n-r)!"/>
<bullet><b>Diagram Pohon (Tree Diagram):</b> Alat memvisualkan logika bersyarat. Tiap simpul adalah satu tahap, tiap garis adalah alur peluangnya. (lihat materi sesi 4, slide 29 untuk visualisasi Diagram Pohon bersyarat silang kategori usia dan tayangan film) .</bullet>
<slide src="statistik/m4-tree-diagram-movies-age.png" alt="Tree Diagram probabilitas bersyarat silang kategori usia dan tayangan film"/>
<bullet><b>Dinamika Teorema Bayes:</b> Rumus untuk memperbarui <b>Prior Probability</b> (estimasi awal sebelum ada info baru) menjadi <b>Posterior Probability</b> (nilai terbaru setelah bukti masuk). (lihat materi sesi 4, slide 30 dan 32 untuk formula Bayes beserta contoh pengujian penyakit populasi Umen) .</bullet>
<slide src="statistik/m4-bayes-theorem-formula.png" alt="Formula Teorema Bayes: P(A1|B) = P(A1)P(B|A1) / [P(A1)P(B|A1) + P(A2)P(B|A2)]"/>
<slide src="statistik/m4-bayes-theorem-umen.png" alt="Contoh Teorema Bayes: pengujian penyakit populasi Umen"/>
`;
