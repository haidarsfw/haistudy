export const statistikModule2 = `
<h1>Modul 2: Ukuran Numerik Data & Konsep Probabilitas Dasar</h1>

<h2>Topik 3: Ukuran Numerik Data (Ukuran Lokasi & Dispersi)</h2>

Ukuran lokasi menggambarkan titik pusat sekumpulan data. Ada tiga ukuran utama: rata-rata (Mean), nilai tengah (Median), dan nilai paling sering muncul (Mode).

<h3>Rata-rata (Mean)</h3>
Rata-rata aritmatika adalah ukuran paling umum. Caranya: jumlahkan semua nilai, lalu bagi dengan banyaknya data. Kelebihannya: memakai semua data, nilainya unik, dan total deviasi dari rata-rata selalu nol. Kelemahannya: gampang tertarik nilai ekstrem.
<slide src="statistik/mean-balance-visualization.png" alt="Visualisasi timbangan rata-rata"/>
<bullet><b>Mean Populasi (Parameter):</b> $\\mu = \\frac{\\Sigma x}{N}$. Contoh: Rata-rata jarak 42 pintu keluar jalan tol.</bullet>
<bullet><b>Mean Sampel (Statistik):</b> $\\bar{x} = \\frac{\\Sigma x}{n}$. Contoh: Rata-rata jam pakai ponsel pelanggan dari sampel acak.</bullet>

<h3>Median & Mode</h3>
<bullet><b>Median:</b> Nilai tengah setelah data diurutkan dari kecil ke besar. Minimal butuh skala ordinal. 50% data ada di atas dan 50% di bawah median. Kebal nilai ekstrem. Kalau jumlah data genap, median adalah rata-rata dua nilai tengah. Contoh: Median harga rumah sebesar $70,000.</bullet>
<bullet><b>Mode:</b> Nilai yang paling sering muncul. Bisa dipakai di data nominal. Satu set data bisa punya banyak mode atau tidak ada mode sama sekali. Contoh: Aroma sabun mandi favorit responden.</bullet>
Bentuk kurva menunjukkan posisi ketiganya: di distribusi simetris, mean, median, dan mode berada di titik yang sama. Di positive skew, mean lebih besar dari median. Di negative skew, mean lebih kecil dari median.
<slide src="statistik/mean-median-mode-positions.png" alt="Kurva posisi relatif Mean, Median, dan Mode"/>

<h3>Mean Berbobot & Mean Geometris</h3>
<bullet><b>Weighted Mean:</b> Tiap nilai dikali bobotnya, lalu dijumlahkan dan dibagi total bobot: $\\bar{x}_w = \\frac{\\Sigma (w \\cdot x)}{\\Sigma w}$. Contoh: Gaji rata-rata karyawan yang tarif per jamnya beda-beda.</bullet>
<bullet><b>Geometric Mean:</b> Dipakai untuk mencari rata-rata tingkat perubahan dari waktu ke waktu. Syarat: nilai harus positif. Hasilnya tidak pernah lebih besar dari rata-rata aritmatika. Rumus rasio: $GM = \\sqrt[n]{(x_1)(x_2)...(x_n)}$. Rumus nilai awal-akhir: $GM = \\sqrt[n]{\\frac{\\text{Value at end of period}}{\\text{Value at start of period}}} - 1$. Contoh: Rata-rata persentase kenaikan laba tahunan perusahaan.</bullet>

<h3>Ukuran Dispersi (Sebaran Data)</h3>
Dispersi mengukur seberapa menyebar data. Ukuran lokasi saja tidak cukup untuk melihat penyebaran.
<bullet><b>Range (Rentang):</b> Selisih nilai maksimum dan minimum. Sangat dipengaruhi nilai ekstrem. Contoh: Rentang produksi per jam Pabrik Tucson adalah 20 unit.</bullet>
<slide src="statistik/range-monitor-plants.png" alt="Grafik produksi per jam pabrik monitor Baton Rouge dan Tucson"/>
<bullet><b>Varians Populasi:</b> Rata-rata kuadrat deviasi tiap nilai dari mean: $\\sigma^2 = \\frac{\\Sigma (x - \\mu)^2}{N}$.</bullet>
<bullet><b>Standar Deviasi Populasi:</b> Akar dari varians ($\\sigma = \\sqrt{\\sigma^2}$) supaya satuan ukurnya kembali ke bentuk asli. Contoh: Standar deviasi jumlah tilang adalah 11.14.</bullet>
<slide src="statistik/standard-deviation-formula.png" alt="Rumus dan contoh standar deviasi populasi"/>
<bullet><b>Varians & Standar Deviasi Sampel:</b> Penyebutnya $n-1$ sebagai koreksi estimasi populasi: $s^2 = \\frac{\\Sigma (x - \\bar{x})^2}{n-1}$..</bullet>
<slide src="statistik/sample-variance-wages.png" alt="Tabel kalkulasi varians dan standar deviasi sampel upah per jam"/>

<h3>Teorema Estimasi Sebaran</h3>
<bullet><b>Teorema Chebyshev:</b> Berlaku untuk semua bentuk distribusi. Proporsi nilai dalam $k$ standar deviasi dari mean minimal $1 - \\frac{1}{k^2}$.</bullet>
<bullet><b>Empirical Rule (Normal Rule):</b> Khusus distribusi simetris berbentuk lonceng. Kira-kira 68%, 95%, dan 99.7% nilai berada dalam 1, 2, dan 3 standar deviasi dari mean.</bullet>
<slide src="statistik/empirical-rule-normal-curve.png" alt="Kurva distribusi normal dengan aturan empiris 68-95-99.7 persen"/>

<h2>Topik 4: Konsep Dasar Probabilitas</h2>

Probabilitas adalah angka antara 0 (mustahil) dan 1 (pasti terjadi) yang menunjukkan kemungkinan suatu peristiwa terjadi.
<slide src="statistik/probability-scale.png" alt="Skala probabilitas dari 0 (mustahil) hingga 1 (pasti terjadi)"/>
Eksperimen adalah proses yang menghasilkan satu hasil. Hasil (outcome) adalah hasil spesifik dari eksperimen. Kejadian (event) adalah kumpulan satu atau lebih kemungkinan hasil.
<slide src="statistik/experiment-outcome-event-table.png" alt="Tabel eksperimen dadu dan direksi Fortune 500"/>

<h3>Pendekatan Probabilitas</h3>
<slide src="statistik/approaches-to-probability.png" alt="Bagan pendekatan probabilitas: Objektif (Klasik dan Empiris) dan Subjektif"/>
<bullet><b>Pendekatan Klasik (Objektif):</b> Menganggap semua hasil eksperimen punya peluang sama. Probabilitas = Hasil menguntungkan / Total hasil yang mungkin.</bullet>
<bullet><b>Pendekatan Empiris (Objektif):</b> Berdasarkan frekuensi relatif hasil observasi nyata. Dasarnya <b>Hukum Bilangan Besar (Law of Large Numbers)</b>: makin banyak eksperimen, makin dekat probabilitas empiris ke probabilitas sebenarnya.</bullet>
<bullet><b>Pendekatan Subjektif:</b> Estimasi berdasarkan opini pribadi dan info yang ada, karena tidak ada data historis.</bullet>

<h3>Kaidah Perhitungan Total Hasil</h3>
<bullet><b>Rumus Perkalian:</b> Total kombinasi dua kejadian independen dihitung $(m)(n)$. Contoh: Undian 3 tabung bola "Pick 3" punya 1.000 kemungkinan hasil.</bullet>
<bullet><b>Permutasi:</b> Menyusun $r$ objek dari $n$ total, urutan penting. Rumus: $^nP_r = \\frac{n!}{(n-r)!}$. Contoh: Menyusun 3 segmen iklan dari 8 video.</bullet>
<bullet><b>Kombinasi:</b> Menyusun $r$ objek dari $n$ total, urutan tidak penting. Rumus menghilangkan perhitungan ganda dari permutasi: $^nC_r = \\frac{n!}{r!(n-r)!}$.</bullet>

<h3>Aturan Penjumlahan & Peluang Komplemen</h3>
<b>Mutually Exclusive</b>: kalau satu kejadian terjadi, kejadian lain tidak bisa terjadi bersamaan. <b>Collectively Exhaustive</b>: minimal satu kejadian pasti muncul saat eksperimen dijalankan.
<bullet><b>Aturan Penjumlahan Khusus:</b> Dipakai kalau kejadiannya mutually exclusive: $P(A \\text{ or } B) = P(A) + P(B)$.</bullet>
<slide src="statistik/venn-mutually-exclusive.png" alt="Diagram Venn tiga kejadian Mutually Exclusive"/>
<bullet><b>Aturan Komplemen:</b> Cari probabilitas kejadian dengan mengurangi peluang tidak terjadinya dari 1: $P(A) = 1 - P(\\sim A)$.</bullet>
<slide src="statistik/venn-complement-rule.png" alt="Diagram Venn aturan komplemen Event A dan ~A"/>
<bullet><b>Aturan Penjumlahan Umum:</b> Dipakai kalau kejadiannya tidak mutually exclusive. Kurangi irisannya (Joint Probability) supaya tidak dihitung dua kali. Rumus: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$. Contoh: Peluang kartu King atau Hati di dek standar.</bullet>
<slide src="statistik/venn-joint-probability.png" alt="Diagram Venn Joint Probability Disney dan Busch Gardens"/>

<h3>Aturan Perkalian & Teorema Bayes</h3>
<bullet><b>Aturan Perkalian Khusus:</b> Dipakai kalau kejadiannya Independen (tidak saling memengaruhi): $P(A \\text{ and } B) = P(A) \\cdot P(B)$.</bullet>
<bullet><b>Aturan Perkalian Umum:</b> Dipakai kalau kejadiannya dependen, via Probabilitas Kondisional: $P(A \\text{ and } B) = P(A) \\cdot P(B|A)$. Contoh: Peluang pria mengambil 2 kemeja putih berturut-turut tanpa dikembalikan.</bullet>
<bullet><b>Tabel Kontingensi & Tree Diagram:</b> Tabel silang untuk mengelompokkan observasi dua variabel sekaligus.</bullet>
<slide src="statistik/contingency-table-movies-age.png" alt="Tabel kontingensi frekuensi penonton film berdasarkan usia"/>
Tree Diagram (Diagram Pohon) menunjukkan tahapan hitungan bersyarat secara visual.
<slide src="statistik/tree-diagram-movies-age.png" alt="Tree Diagram probabilitas usia penonton film"/>
<bullet><b>Teorema Bayes:</b> Cara matematis merevisi <b>Prior Probability</b> (probabilitas awal) menjadi <b>Posterior Probability</b> (probabilitas setelah ada bukti baru)..</bullet>
<slide src="statistik/bayes-theorem-disease-test.png" alt="Tabel dan formula Teorema Bayes pengujian penyakit"/>
`;
