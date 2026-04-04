export const statistikModule4 = `
<h1>Modul 4: Penyempurna & Pendalaman Materi Ekstraktif</h1>

<h2>Konsep Fundamental Statistika & Data</h2>
<bullet><b>Parameter vs Statistik:</b> Nilai numerik pengukur karakteristik dari keseluruhan populasi ($\\mu$) diklasifikasikan sebagai <b>Parameter</b>. Angka pengukur karakteristik dari sebagian populasi atau sampel ($\\bar{x}$) diklasifikasikan sebagai <b>Statistik</b>.</bullet>
<bullet><b>Volume Data Era Digital:</b> Observasi data di dunia nyata terus berkembang secara eksponensial di berbagai platform, membutuhkan validasi statistik tingkat tinggi untuk memprosesnya menjadi keputusan bisnis. (lihat materi sesi 1, slide 3 untuk infografis Domo mengenai laju data per menit seperti 856 tayangan Zoom dan 167 juta video TikTok) .</bullet>

<h2>Kaidah Rigor Tabel Distribusi Frekuensi</h2>
<bullet><b>Aturan Eksklusivitas:</b> Syarat mutually exclusive mengharuskan pemisahan batas kategori secara tegas di mana setiap observasi hanya dapat terklasifikasi ke dalam satu kelas tunggal tanpa tumpang tindih.</bullet>
<bullet><b>Aturan Ekshaustif:</b> Syarat collectively exhaustive menuntut ketersediaan kelas penampung untuk setiap kemungkinan kemunculan nilai observasi tanpa ada data yang tertinggal.</bullet>
<bullet><b>Penentuan Batas Distribusi:</b> Aturan matematis $2^k > n$ menentukan kuantitas kelas optimal. (lihat materi sesi 2, slide 11 untuk aplikasi batas 180 sampel yang mewajibkan 8 kelas karena $2^8 = 256 > 180$) . Interval kelas wajib konsisten dan didapat melalui pembagian rentang data dengan kuantitas kelas, dikalibrasi pembulatan ke atas. (lihat materi sesi 2, slide 12 untuk kalkulasi rasio $374.75$ yang dibulatkan menjadi kelipatan $400) .</bullet>

<h2>Properti Spesifik Ukuran Numerik</h2>
<bullet><b>Sifat Mutlak Rata-rata:</b> Jumlah keseluruhan titik deviasi (selisih) antara setiap nilai individual observasi terhadap titik rata-rata aritmatikanya dipastikan selalu ekuivalen dengan nol.</bullet>
<bullet><b>Geometric Mean (Tingkat Perubahan):</b> Kalkulasi rasio rata-rata geometri wajib mengekspresikan persentase periode ke dalam format konversi $1.0 + \\text{perubahan}$ guna mencegah kegagalan perhitungan akibat masuknya rasio negatif. (lihat materi sesi 3, slide 17 untuk rumusan pengali persentase ROI minus 40% menjadi nilai ukur 0.6 yang menghindari distorsi) .</bullet>
<bullet><b>Geometric Mean (Awal-Akhir):</b> Metode pelacakan perbandingan linier titik akhir suatu rentang observasi terhadap titik pangkal berbasis modifikasi akar pangkat horizon waktu. (lihat materi sesi 3, slide 18 untuk formula $\\sqrt[n]{\\text{Akhir}/\\text{Awal}} - 1$ beserta bukti contoh kenaikan upah riil $45.000 ke $100.000) .</bullet>
<bullet><b>Konstanta Teorema Chebyshev:</b> Proporsi matematis minimum persebaran data secara presisi dapat diformulasikan melalui $1 - \\frac{1}{k^2}$. (lihat materi sesi 3, slide 29 untuk pembuktian substitusi nilai $k=2$ sebesar $75\\%$ dan nilai $k=3$ sebesar $88.9\\%$) .</bullet>

<h2>Kelengkapan Mekanisme Probabilitas</h2>
<bullet><b>Hukum Bilangan Besar (Law of Large Numbers):</b> Jumlah repetisi uji coba eksperimen dalam skala masif secara otomatis akan menggeser rentang presisi probabilitas empiris mendekati titik ekuivalibrium probabilitas teoritis sejatinya. (lihat materi sesi 4, slide 12 untuk tabulasi pergerakan kestabilan frekuensi relatif dari 10 menjadi 10.000 kali lemparan eksperimen) .</bullet>
<bullet><b>Formula Perkalian Susunan:</b> Limit konfigurasi penataan kejadian dari beragam grup terpisah diukur menggunakan relasi perkalian $(m)(n)$. Contoh: Sistem undian tiga tabung bola "Pick 3" memproduksi rasio limit persis $1000$ susunan keluaran.</bullet>
<bullet><b>Koreksi Overcounting Kombinasi:</b> Penerapan rumus permutasi pada uji coba orderless (tanpa urutan) memicu perhitungan ganda (overcounting), mengharuskan penggunaan rumus kombinasi dengan penyebut ekstraksional $r!$ demi menetralisasi permutasi ganda. (lihat materi sesi 4, slide 9 untuk fungsi dekonstruktif pembagi faktorial dalam rumus kombinasi) .</bullet>
<bullet><b>Diagram Pohon (Tree Diagram):</b> Instrumen pemetaan logika bersyarat di mana simpul mempresentasikan tahap masalah dan garis penghubung bertindak sebagai rute alokasi kuota probabilitas absolut. (lihat materi sesi 4, slide 29 untuk arsitektur visual Diagram Pohon bersyarat silang kategori usia dan tayangan film) .</bullet>
<bullet><b>Dinamika Teorema Bayes:</b> Arsitektur persamaan pembaharuan probabilitas terstruktur yang merestrukturisasi <b>Prior Probability</b> (estimasi inisial sebelum informasi tersingkap) menjadi <b>Posterior Probability</b> (nilai validasi terbaru pasca kedatangan indikator konfirmasi uji). (lihat materi sesi 4, slide 30 dan 32 untuk formula probabilitas terbalik Bayes beserta konversi matriks pasien penyakit populasi Umen) .</bullet>
`;
