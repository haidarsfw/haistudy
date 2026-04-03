export const statistikModule2 = `
<h1>Modul 2: Ukuran Numerik Data & Konsep Probabilitas Dasar</h1>

<h2>Topik 3: Ukuran Numerik Data (Ukuran Lokasi & Dispersi)</h2>

<h3>Ukuran Lokasi (Tendensi Sentral)</h3>
<bullet>Ukuran lokasi mendeskripsikan tendensi sentral dari sekumpulan data. Tiga metrik utama yang digunakan adalah rata-rata (Mean), nilai tengah (Median), dan nilai yang paling sering muncul (Mode).</bullet>

<h3>Rata-rata (Mean)</h3>
<bullet>Rata-rata aritmatika adalah ukuran lokasi paling umum, dihitung dengan menjumlahkan seluruh nilai lalu membaginya dengan jumlah observasi. Metrik ini memanfaatkan seluruh nilai data, sifatnya unik, dan jumlah deviasi dari rata-rata selalu bernilai nol. Kelemahan utamanya adalah sangat terpengaruh oleh nilai ekstrem.</bullet>
<bullet><b>Mean Populasi (Parameter):</b> $\\mu = \\frac{\\Sigma x}{N}$</bullet>
<bullet>Contoh: Rata-rata jarak 42 pintu keluar jalan tol.</bullet>
<bullet><b>Mean Sampel (Statistik):</b> $\\bar{x} = \\frac{\\Sigma x}{n}$</bullet>
<bullet>Contoh: Rata-rata jam penggunaan ponsel pelanggan seluler dari sampel acak.</bullet>

<h3>Median & Mode</h3>
<bullet><b>Median:</b> Titik tengah data setelah diurutkan dari nilai minimum ke maksimum, membutuhkan minimal skala pengukuran ordinal. Sebanyak 50% observasi berada di atas dan di bawah median, serta kebal terhadap nilai ekstrem. Jika jumlah data genap, median adalah rata-rata dari dua nilai tengah. Contoh: Median harga unit rumah sebesar $70,000.</bullet>
<bullet><b>Mode:</b> Nilai dengan frekuensi kemunculan tertinggi, dapat diterapkan pada data nominal. Satu set data dapat memiliki lebih dari satu mode atau tidak memiliki mode sama sekali. Contoh: Aroma sabun mandi yang paling difavoritkan responden.</bullet>
<bullet><b>Hubungan posisi pada kurva:</b> Pada distribusi simetris, mean, median, dan mode berada di titik yang sama; pada positive skew, mean lebih besar dari median; pada negative skew, mean lebih kecil dari median.</bullet>

<h3>Mean Berbobot & Mean Geometris</h3>
<bullet><b>Weighted Mean:</b> Dihitung dengan mengalikan setiap observasi dengan bobot yang bersesuaian, dibagikan dengan total bobot keseluruhan: $\\bar{x}_w = \\frac{\\Sigma (w \\cdot x)}{\\Sigma w}$</bullet>
<bullet>Contoh: Gaji rata-rata karyawan berbasis tarif per jam yang berbeda.</bullet>
<bullet><b>Geometric Mean (Rasio):</b> Berfungsi mencari rata-rata tingkat perubahan seiring waktu, mensyaratkan nilai positif, dan tidak akan pernah melebihi rata-rata aritmatika. Rumus: $GM = \\sqrt[n]{(x_1)(x_2)...(x_n)}$</bullet>
<bullet><b>Geometric Mean (Awal-Akhir):</b> $GM = \\sqrt[n]{\\frac{\\text{Nilai Akhir}}{\\text{Nilai Awal}}} - 1$</bullet>
<bullet>Contoh: Rata-rata persentase peningkatan laba tahunan perusahaan.</bullet>

<h3>Ukuran Dispersi (Sebaran Data)</h3>
<bullet>Dispersi mengukur rentang variasi kumpulan data karena ukuran lokasi saja tidak cukup mendeskripsikan penyebaran observasi.</bullet>
<bullet><b>Range (Rentang):</b> Selisih nilai maksimum dan nilai minimum, sangat dipengaruhi oleh nilai ekstrem. Contoh: Rentang target produksi per jam Pabrik Tucson adalah 20 unit.</bullet>
<bullet><b>Varians Populasi:</b> Rata-rata kuadrat deviasi dari mean: $\\sigma^2 = \\frac{\\Sigma (x - \\mu)^2}{N}$</bullet>
<bullet><b>Standar Deviasi Populasi:</b> Akar kuadrat dari varians: $\\sigma = \\sqrt{\\sigma^2}$</bullet>
<bullet>Contoh: Simpangan baku jumlah tilang lalu lintas adalah 11.14.</bullet>
<bullet><b>Varians & Standar Deviasi Sampel:</b> Dirumuskan dengan penyebut $n - 1$ sebagai koreksi estimasi populasi: $s^2 = \\frac{\\Sigma (x - \\bar{x})^2}{n - 1}$</bullet>

<h3>Teorema Estimasi Sebaran</h3>
<bullet><b>Teorema Chebyshev:</b> Berlaku untuk semua bentuk distribusi data, menyatakan bahwa proporsi nilai dalam $k$ standar deviasi dari mean minimal bernilai $1 - \\frac{1}{k^2}$.</bullet>
<bullet><b>Empirical Rule (Normal Rule):</b> Berlaku spesifik untuk distribusi simetris berbentuk lonceng, mengestimasi bahwa 68%, 95%, dan 99.7% nilai berada di rentang 1, 2, dan 3 standar deviasi dari mean secara berurutan.</bullet>

<h2>Topik 4: Konsep Dasar Probabilitas</h2>

<h3>Definisi Probabilitas</h3>
<bullet>Probabilitas adalah nilai antara 0 (mustahil) dan 1 (pasti terjadi) inklusif yang merepresentasikan kemungkinan terjadinya suatu peristiwa.</bullet>
<bullet><b>Eksperimen:</b> Proses yang mengarah pada kemunculan satu hasil pasti.</bullet>
<bullet><b>Hasil (Outcome):</b> Hasil spesifik dari eksperimen.</bullet>
<bullet><b>Kejadian (Event):</b> Kumpulan satu atau lebih kemungkinan hasil dari eksperimen tersebut.</bullet>

<h3>Pendekatan Probabilitas</h3>
<bullet><b>Pendekatan Klasik (Objektif):</b> Didasarkan pada asumsi bahwa seluruh hasil eksperimen memiliki kemungkinan yang sama. Probabilitas = Hasil menguntungkan / Total hasil yang mungkin.</bullet>
<bullet><b>Pendekatan Empiris (Objektif):</b> Didasarkan pada frekuensi relatif observasi nyata. Berlandaskan pada <b>Hukum Bilangan Besar (Law of Large Numbers)</b>, di mana eksperimen berskala besar akan membuat probabilitas empiris mendekati probabilitas sebenarnya.</bullet>
<bullet><b>Pendekatan Subjektif:</b> Estimasi kemungkinan berdasarkan opini individu dan informasi spesifik yang tersedia karena ketiadaan data historis.</bullet>

<h3>Kaidah Perhitungan Total Hasil</h3>
<bullet><b>Rumus Perkalian:</b> Total probabilitas kombinasi dua kejadian independen dikalkulasikan sebagai $(m)(n)$. Contoh: Pengundian 3 tabung bola "Pick 3" memiliki 1.000 hasil kemungkinan.</bullet>
<bullet><b>Permutasi:</b> Pengaturan $r$ objek dari total $n$ di mana urutan (orde) sangat diperhitungkan. Rumus: $_nP_r = \\frac{n!}{(n-r)!}$</bullet>
<bullet>Contoh: Penyusunan 3 segmen iklan dari 8 video.</bullet>
<bullet><b>Kombinasi:</b> Pengaturan $r$ objek dari total $n$ di mana urutan kemunculan tidak relevan. Rumus: $_nC_r = \\frac{n!}{r!(n-r)!}$</bullet>

<h3>Aturan Penjumlahan & Peluang Komplemen</h3>
<bullet><b>Mutually Exclusive:</b> Jika satu kejadian terjadi, kejadian lain tidak dapat terjadi di saat yang sama.</bullet>
<bullet><b>Collectively Exhaustive:</b> Minimal satu kejadian harus muncul saat eksperimen dilakukan.</bullet>
<bullet><b>Aturan Penjumlahan Khusus (Mutually Exclusive):</b> $P(A \\text{ or } B) = P(A) + P(B)$</bullet>
<bullet><b>Aturan Komplemen:</b> $P(A) = 1 - P(\\sim A)$</bullet>
<bullet><b>Aturan Penjumlahan Umum (Not Mutually Exclusive):</b> $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$</bullet>
<bullet>Contoh: Peluang kartu King atau Hati di dek standar.</bullet>

<h3>Aturan Perkalian & Teorema Bayes</h3>
<bullet><b>Aturan Perkalian Khusus (Independen):</b> $P(A \\text{ and } B) = P(A) \\cdot P(B)$</bullet>
<bullet><b>Aturan Perkalian Umum (Dependen):</b> $P(A \\text{ and } B) = P(A) \\cdot P(B|A)$</bullet>
<bullet>Contoh: Probabilitas pria mengambil 2 kemeja putih secara buta berturut-turut tanpa dikembalikan.</bullet>
<bullet><b>Tabel Kontingensi:</b> Tabulasi silang berfungsi mengklasifikasikan observasi dua variabel secara simultan.</bullet>
<bullet><b>Tree Diagram:</b> Diagram Pohon merepresentasikan tahapan kalkulasi bersyarat secara visual.</bullet>
<bullet><b>Teorema Bayes:</b> Metode matematis untuk merevisi <b>Prior Probability</b> (probabilitas inisial) menjadi <b>Posterior Probability</b> (probabilitas setelah bukti masuk).</bullet>
`;
