export const statistikModule2 = `
<h1>Modul 2: Ukuran Numerik Data & Konsep Probabilitas Dasar</h1>

<h2>Topik 3: Ukuran Numerik Data (Ukuran Lokasi & Dispersi)</h2>

Ukuran lokasi mendeskripsikan tendensi sentral dari sekumpulan data. Tiga metrik utama yang digunakan adalah rata-rata (Mean), nilai tengah (Median), dan nilai yang paling sering muncul (Mode).

<h3>Rata-rata (Mean)</h3>
Rata-rata aritmatika adalah ukuran lokasi paling umum, dihitung dengan menjumlahkan seluruh nilai lalu membaginya dengan jumlah observasi. Metrik ini memanfaatkan seluruh nilai data, sifatnya unik, dan jumlah deviasi dari rata-rata selalu bernilai nol. Kelemahan utamanya adalah sangat terpengaruh oleh nilai ekstrem (lihat materi sesi 3, slide 8 untuk visualisasi timbangan rata-rata).
<bullet><b>Mean Populasi (Parameter):</b> $\\mu = \\frac{\\Sigma x}{N}$. Contoh: Rata-rata jarak 42 pintu keluar jalan tol.</bullet>
<bullet><b>Mean Sampel (Statistik):</b> $\\bar{x} = \\frac{\\Sigma x}{n}$. Contoh: Rata-rata jam penggunaan ponsel pelanggan seluler dari sampel acak.</bullet>

<h3>Median & Mode</h3>
<bullet><b>Median:</b> Titik tengah data setelah diurutkan dari nilai minimum ke maksimum, membutuhkan minimal skala pengukuran ordinal. Sebanyak 50% observasi berada di atas dan di bawah median, serta kebal terhadap nilai ekstrem. Jika jumlah data genap, median adalah rata-rata dari dua nilai tengah. Contoh: Median harga unit rumah sebesar $70,000.</bullet>
<bullet><b>Mode:</b> Nilai dengan frekuensi kemunculan tertinggi, dapat diterapkan pada data nominal. Satu set data dapat memiliki lebih dari satu mode atau tidak memiliki mode sama sekali. Contoh: Aroma sabun mandi yang paling difavoritkan responden.</bullet>
Bentuk kurva memvisualisasikan posisi ketiganya: pada distribusi simetris, mean, median, dan mode berada di titik yang sama; pada positive skew, mean lebih besar dari median; pada negative skew, mean lebih kecil dari median (lihat materi sesi 3, slide 13 untuk ketiga Kurva Posisi).

<h3>Mean Berbobot & Mean Geometris</h3>
<bullet><b>Weighted Mean:</b> Dihitung dengan mengalikan setiap observasi dengan bobot yang bersesuaian, dibagikan dengan total bobot keseluruhan, dirumuskan sebagai $\\bar{x}_w = \\frac{\\Sigma (w \\cdot x)}{\\Sigma w}$. Contoh: Gaji rata-rata karyawan berbasis tarif per jam yang berbeda.</bullet>
<bullet><b>Geometric Mean:</b> Berfungsi mencari rata-rata tingkat perubahan seiring waktu, mensyaratkan nilai positif, dan tidak akan pernah melebihi rata-rata aritmatika. Rumus rasio nilai: $GM = \\sqrt[n]{(x_1)(x_2)...(x_n)}$. Rumus nilai awal-akhir: $GM = \\sqrt[n]{\\frac{\\text{Value at end of period}}{\\text{Value at start of period}}} - 1$. Contoh: Rata-rata persentase peningkatan laba tahunan perusahaan.</bullet>

<h3>Ukuran Dispersi (Sebaran Data)</h3>
Dispersi mengukur rentang variasi kumpulan data karena ukuran lokasi saja tidak cukup mendeskripsikan penyebaran observasi.
<bullet><b>Range (Rentang):</b> Selisih nilai maksimum dan nilai minimum, sangat dipengaruhi oleh nilai ekstrem. Contoh: Rentang target produksi per jam Pabrik Tucson adalah 20 unit (lihat materi sesi 3, slide 21 untuk grafik pabrik monitor).</bullet>
<bullet><b>Varians Populasi:</b> Rata-rata kuadrat deviasi dari mean, dirumuskan $\\sigma^2 = \\frac{\\Sigma (x - \\mu)^2}{N}$.</bullet>
<bullet><b>Standar Deviasi Populasi:</b> Akar kuadrat dari varians ($\\sigma = \\sqrt{\\sigma^2}$) untuk mengembalikan satuan ukur ke bentuk asli. Contoh: Simpangan baku jumlah tilang lalu lintas adalah 11.14 (lihat materi sesi 3, slide 25 untuk tabel kalkulasi $(x-\\mu)^2$) .</bullet>
<bullet><b>Varians & Standar Deviasi Sampel:</b> Dirumuskan dengan penyebut $n-1$ sebagai koreksi estimasi populasi, $s^2 = \\frac{\\Sigma (x - \\bar{x})^2}{n-1}$. (lihat materi sesi 3, slide 28 untuk tabel upah per jam) .</bullet>

<h3>Teorema Estimasi Sebaran</h3>
<bullet><b>Teorema Chebyshev:</b> Berlaku untuk semua bentuk distribusi data, menyatakan bahwa proporsi nilai dalam $k$ standar deviasi dari mean minimal bernilai $1 - \\frac{1}{k^2}$.</bullet>
<bullet><b>Empirical Rule (Normal Rule):</b> Berlaku spesifik untuk distribusi simetris berbentuk lonceng, mengestimasi bahwa 68%, 95%, dan 99.7% nilai berada di rentang 1, 2, dan 3 standar deviasi dari mean secara berurutan (lihat materi sesi 3, slide 32 untuk Kurva Distribusi Normal) .</bullet>

<h2>Topik 4: Konsep Dasar Probabilitas</h2>

Probabilitas adalah nilai antara 0 (mustahil) dan 1 (pasti terjadi) inklusif yang merepresentasikan kemungkinan terjadinya suatu peristiwa (lihat materi sesi 4, slide 2 untuk skala probabilitas visual). Eksperimen adalah proses yang mengarah pada kemunculan satu hasil pasti; hasil (outcome) adalah hasil spesifik dari eksperimen; sedangkan kejadian (event) merupakan kumpulan satu atau lebih kemungkinan hasil dari eksperimen tersebut (lihat materi sesi 4, slide 3 untuk tabel eksperimen dadu dan direksi Fortune 500).

<h3>Pendekatan Probabilitas (lihat materi sesi 4, slide 15 untuk bagan Approaches to Probability)</h3>
<bullet><b>Pendekatan Klasik (Objektif):</b> Didasarkan pada asumsi bahwa seluruh hasil eksperimen memiliki kemungkinan yang sama. Probabilitas = Hasil menguntungkan / Total hasil yang mungkin.</bullet>
<bullet><b>Pendekatan Empiris (Objektif):</b> Didasarkan pada frekuensi relatif observasi nyata. Berlandaskan pada <b>Hukum Bilangan Besar (Law of Large Numbers)</b>, di mana eksperimen berskala besar akan membuat probabilitas empiris mendekati probabilitas sebenarnya.</bullet>
<bullet><b>Pendekatan Subjektif:</b> Estimasi kemungkinan berdasarkan opini individu dan informasi spesifik yang tersedia karena ketiadaan data historis.</bullet>

<h3>Kaidah Perhitungan Total Hasil</h3>
<bullet><b>Rumus Perkalian:</b> Total probabilitas kombinasi dua kejadian independen dikalkulasikan sebagai $(m)(n)$. Contoh: Pengundian 3 tabung bola "Pick 3" memiliki 1.000 hasil kemungkinan.</bullet>
<bullet><b>Permutasi:</b> Pengaturan $r$ objek dari total $n$ di mana urutan (orde) sangat diperhitungkan. Rumus: $^nP_r = \\frac{n!}{(n-r)!}$. Contoh: Penyusunan 3 segmen iklan dari 8 video .</bullet>
<bullet><b>Kombinasi:</b> Pengaturan $r$ objek dari total $n$ di mana urutan kemunculan tidak relevan sama sekali. Rumus mengeliminasi hitungan ganda permutasi: $^nC_r = \\frac{n!}{r!(n-r)!}$.</bullet>

<h3>Aturan Penjumlahan & Peluang Komplemen</h3>
<b>Mutually Exclusive</b> berarti jika satu kejadian terjadi, kejadian lain tidak dapat terjadi di saat yang sama. <b>Collectively Exhaustive</b> berarti minimal satu kejadian harus muncul saat eksperimen dilakukan.
<bullet><b>Aturan Penjumlahan Khusus:</b> Berlaku jika kejadian mutually exclusive: $P(A \\text{ or } B) = P(A) + P(B)$ (lihat materi sesi 4, slide 17 untuk Diagram Venn Mutually Exclusive).</bullet>
<bullet><b>Aturan Komplemen:</b> Menentukan probabilitas kejadian dengan mengurangi persentase tidak terjadinya peristiwa dari angka 1, $P(A) = 1 - P(\\sim A)$ (lihat materi sesi 4, slide 19 untuk Diagram Venn Komplemen).</bullet>
<bullet><b>Aturan Penjumlahan Umum:</b> Diterapkan saat peristiwa tidak mutually exclusive dengan mengurangi irisannya (Joint Probability) untuk mencegah penghitungan ganda. Rumus: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$ (lihat materi sesi 4, slide 21 untuk Diagram Venn Joint Probability). Contoh: Peluang kartu King atau Hati di dek standar.</bullet>

<h3>Aturan Perkalian & Teorema Bayes</h3>
<bullet><b>Aturan Perkalian Khusus:</b> Diterapkan bagi kejadian Independen (kejadian tidak saling memengaruhi), dirumuskan $P(A \\text{ and } B) = P(A) \\cdot P(B)$.</bullet>
<bullet><b>Aturan Perkalian Umum:</b> Diterapkan bagi peristiwa dependen melalui konsep Probabilitas Kondisional, dirumuskan $P(A \\text{ and } B) = P(A) \\cdot P(B|A)$. Contoh: Probabilitas pria mengambil 2 kemeja putih secara buta berturut-turut tanpa dikembalikan .</bullet>
<bullet><b>Tabel Kontingensi & Tree Diagram:</b> Tabulasi silang berfungsi mengklasifikasikan observasi dua variabel secara simultan (lihat materi sesi 4, slide 28 untuk tabel frekuensi pria/wanita dan film). Diagram Pohon merepresentasikan tahapan kalkulasi bersyarat secara visual (lihat materi sesi 4, slide 29 untuk visualisasi Tree Diagram Usia Penonton Film).</bullet>
<bullet><b>Teorema Bayes:</b> Metode matematis untuk merevisi <b>Prior Probability</b> (probabilitas inisial) menjadi <b>Posterior Probability</b> (probabilitas setelah bukti masuk). (lihat materi sesi 4, slide 32 untuk formula kompleks dan kalkulasi pengujian penyakit Umen) .</bullet>
`;
