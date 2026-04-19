import type { SubjectContent } from "@/types";
import { statistikQuiz } from "./statistik-quiz";
import { foundaiFlashcards } from "./foundai-flashcards";
import { foundaiQuiz } from "./foundai-quiz";
import { bisekoFlashcards } from "./biseko-flashcards";
import { bisekoQuiz } from "./biseko-quiz";
import { akuntansiFlashcards } from "./akuntansi-flashcards";
import { akuntansiQuiz } from "./akuntansi-quiz";

/**
 * Placeholder content for all 5 subjects.
 * Actual content (materi, kisi-kisi, flashcards, quiz) will be filled in later.
 * driveId values are placeholders - replace with real Google Drive file IDs.
 */
export const content: Record<string, SubjectContent> = {
  statistik: {
    materi: [
      // Verified 2026-04-15 — audit hasil swap-pair (driveIds sebelumnya terbalik urutannya)
      { id: 1, title: "Introduction to Statistics", driveId: "1BfkJrC8Yqx0FKUFrBm90jHPO8YlnK-tcWWKs1XD_fNw", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Describing Data: Frequency Tables, Frequency Distributions, and Graphic Presentation", driveId: "1EGIHIxNhIMnPDM1EpfZIBEzhLv9WrLrHYvBLbSnx8Ys", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "Describing Data: Numerical Measures", driveId: "1fptNciNWzhXfEyQyAISVl_VQSgCIWdK_oaIBX3zr0cw", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "Introduction to Probability - A Survey of Probability Concepts", driveId: "1zuTLNB-_JXf3oVdjNDOacI4vfAPKsiMmZfsB5BPy1Ic", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Continuous Probability Distributions", driveId: "10VWWLcEqE9m98dsb0k-J9xhwSBRzcCv6YlqHBs2a5vE", type: "drive-gslides", session: "5-6", xp: 10 },
      { id: 6, title: "Discrete Probability Distributions", driveId: "1iJW_GQiv9fSMQZAZTJVRWIiGxBqxnZ4jsqsYP-dIh98", type: "drive-gslides", session: "7", xp: 10 },
      // Materi tambahan dari dosen LE86
      { id: 101, title: "Frequency Distribution", driveId: "1sJJxdAHSZGckdG0eTTb4XUaeSOUOCIy54s4sJF1ETMU", type: "drive-gslides", xp: 5, sectionLabel: "Materi Tambahan — LE86", sectionNote: "Rangkuman yang lebih mudah dipahami dari Prof. Dr. PURWANTO, A.Md., S.T., M.M." },
      { id: 102, title: "Tabel Z", driveId: "1nPcVv2ot0fqrwsi5xhfwAUfSnV7xRHQw", type: "drive-pdf", xp: 5 },
      { id: 103, title: "Describing Data: Revisi Quartil", driveId: "14FQuP-GzgBGILDueC_9lbIW1ZztT4Pld7kfYbv9ximE", type: "drive-gslides", xp: 5 },
      { id: 104, title: "Gabungan Continuous Probability", driveId: "14lsM5j08NdetKlCp4zlVKZFA_ukXlnR-", type: "drive-pdf", xp: 5 },
    ],
    kisiKisi: [
      { topic: "Konsep Dasar Probabilitas", items: [
        "Nilai Probabilitas (antara 0 dan 1)",
        "Event (Peristiwa)",
        "Percobaan (Eksperiment)",
        "Ruang Sampel",
      ] },
      { topic: "Metode Perhitungan", items: [
        "Factorial",
        "Permutasi",
        "Combinasi",
      ] },
      { topic: "Distribusi Probabilitas", items: [
        "Distribusi Hypergeometris",
        "Distribusi Binomium",
        "Distribusi Poison",
        "Distribusi Normal",
        "Mencari luas curve dibawah normal",
      ] },
    ],
    kisiKisiNote: "Materi tidak disebutkan secara spesifik oleh dosen, namun berdasarkan file dari dosen LD86, poin-poinnya adalah sebagai berikut. File yang diberi dosen terlampir di bawah.",
    kisiKisiInfo: [
      { label: "Sifat Ujian", value: "Ujian Tertutup (Closed Book), Full Essay" },
      { label: "Persyaratan", value: "Wajib membawa kalkulator" },
      { label: "Fasilitas Ujian", value: "Rumus dan tabel disediakan" },
      { label: "Sumber", value: "LE86 & LD86" },
    ],
    kisiKisiAttachments: [
      { title: "File Kisi-Kisi dari Dosen LD86", driveId: "1IhBry1_b7Ppy_vVDsckE7WCP_q7Jz5AtHhiS2bNohcw", type: "drive-gdoc" },
    ],
    flashcards: [
      // MODUL 1/TOPIK 1: Pengantar Statistika Bisnis
      { id: 1, term: "Statistika", definition: "Ilmu pengumpulan, pengorganisasian, penyajian, analisis, dan interpretasi data guna memfasilitasi pengambilan keputusan yang efektif." },
      { id: 2, term: "Tujuan Pengetahuan Statistika", definition: "Menghasilkan perbandingan yang valid serta memprediksi hasil keputusan bisnis dalam menangani volume data observasi yang tumbuh eksponensial di era digital (seperti besarnya data tayangan Zoom/TikTok)." },
      { id: 3, term: "Statistika Deskriptif", definition: "Cabang statistika yang berfungsi mengatur, meringkas, dan menyajikan data agar mudah dipahami." },
      { id: 4, term: "Statistika Inferensial", definition: "Cabang statistika yang bertujuan mengestimasi properti atau karakteristik dari sebuah populasi dengan menggunakan sampel acak." },
      { id: 5, term: "Populasi vs Sampel", definition: "Populasi adalah total keseluruhan individu atau objek pengamatan. Sampel adalah sebagian dari populasi yang diambil untuk analisis." },
      { id: 6, term: "Parameter", definition: "Nilai numerik yang mengukur karakteristik dari keseluruhan populasi, disimbolkan dengan $\\mu$." },
      { id: 7, term: "Statistik", definition: "Angka yang mengukur karakteristik dari sebagian populasi atau sampel, disimbolkan dengan $\\bar{x}$." },
      { id: 8, term: "Variabel Kualitatif", definition: "Atribut non-numerik berdasarkan observasi karakteristik, seperti jenis kelamin atau warna rambut." },
      { id: 9, term: "Variabel Kuantitatif Diskret", definition: "Nilai numerik hasil penghitungan yang memiliki jarak atau celah antar nilainya (contoh: jumlah kamar)." },
      { id: 10, term: "Variabel Kuantitatif Kontinu", definition: "Nilai numerik hasil pengukuran berkelanjutan tanpa jeda dalam rentang spesifik (contoh: durasi waktu tempuh penerbangan)." },
      { id: 11, term: "Tingkat Pengukuran Data", definition: "Skala pengukuran yang secara langsung mendikte jenis analisis statistik apa yang paling tepat digunakan untuk suatu data." },
      { id: 12, term: "Tingkat Pengukuran Nominal", definition: "Tingkat dasar berbentuk label tanpa pengurutan khusus, murni berfungsi sebagai klasifikasi atau hitungan (contoh: warna M&M)." },
      { id: 13, term: "Tingkat Pengukuran Ordinal", definition: "Data berbentuk peringkat atau rating berdasarkan variabel kualitatif di mana urutan memiliki makna (contoh: peringkat iklim bisnis)." },
      { id: 14, term: "Tingkat Pengukuran Interval", definition: "Data dengan fungsi ordinal, memiliki jarak antar nilai yang pasti bermakna, namun ketiadaan titik nol mutlak (contoh: temperatur Fahrenheit)." },
      { id: 15, term: "Tingkat Pengukuran Rasio", definition: "Tingkat tertinggi dengan interpretasi jarak bermakna dan kehadiran titik nol absolut yang merepresentasikan ketiadaan variabel tersebut (contoh: upah karyawan)." },
      { id: 16, term: "Etika dalam Analitik Bisnis", definition: "Praktik statistik wajib dijalankan dengan integritas, kejujuran, dan perspektif independen, termasuk keberanian mempertanyakan laporan bias atau sampel tak representatif. Bisnis analitik menggabungkan konsep statistik dengan perangkat lunak modern untuk membangun narasi empiris." },
      // MODUL 1/TOPIK 2: Deskripsi Data, Distribusi Frekuensi, dan Penyajian Visual
      { id: 17, term: "Syarat Tabel Frekuensi Data (Aturan Eksklusivitas & Ekshaustif)", definition: "Harus Mutually Exclusive (satu nilai hanya pada satu kelas spesifik tanpa tumpang tindih) dan Collectively Exhaustive (setiap nilai pasti memiliki kelas penampung tanpa ada yang tertinggal)." },
      { id: 18, term: "Frekuensi Relatif", definition: "Fraksi perhitungan per kelas dibagi dengan total seluruh observasi." },
      { id: 19, term: "Bar Chart (Diagram Batang)", definition: "Visual kualitatif dengan sumbu horizontal untuk mendeskripsikan tipe kualitatif, dan tinggi balok vertikal menunjukkan jumlah kelas frekuensi." },
      { id: 20, term: "Aturan Pengurutan & Modus pada Bar Chart", definition: "Aturan pengurutan tidak berlaku untuk variabel nominal, dan bar (batang) dengan frekuensi absolut terbanyak disebut Modus." },
      { id: 21, term: "Pie Chart", definition: "Visualisasi kualitatif berupa irisan lingkaran yang menyajikan persentase spesifik dari total frekuensi utuh di setiap kelas." },
      { id: 22, term: "Distribusi Frekuensi Data Kuantitatif", definition: "Klasifikasi angka observasi kuantitatif dalam format mutually exclusive dan collectively exhaustive melalui serangkaian penetapan kelas dan interval." },
      { id: 23, term: "Rumus Penetapan Jumlah Kelas", definition: "Ditentukan menggunakan kaidah matematis $2^k > n$, di mana $k$ adalah jumlah kelas dan $n$ adalah total observasi." },
      { id: 24, term: "Rumus Penentuan Lebar Interval Kelas", definition: "Dirumuskan dengan $i \\ge (Maksimum - Minimum) / k$, di mana hasilnya dikalibrasi atau dibulatkan ke atas agar konsisten." },
      { id: 25, term: "Histogram", definition: "Penyajian grafik kuantitatif berwujud struktur balok yang dirapatkan tegak lurus (tanpa celah) untuk mendemonstrasikan spektrum batas distribusi angka pada sumbu horizontal dan level frekuensi mutlak pada sumbu vertikal." },
      { id: 26, term: "Frequency Polygon", definition: "Grafik kuantitatif berwujud garis kontinyu yang mengidentifikasi pola distribusi pusat antar area tengah interval kelas, paling efektif untuk membandingkan ragam kelompok objek secara visual." },
      { id: 27, term: "Distribusi Kumulatif & Ogive", definition: "Distribusi yang melihat akumulasi data saat bergeser ke bawah kelas interval dengan menjumlahkan kuantitas kelas eksisting dengan kelas terdahulu. Divisualisasikan melalui kurva tren persentase bernama Ogive." },
      // MODUL 2/TOPIK 3: Ukuran Numerik Data (Ukuran Lokasi & Dispersi)
      { id: 28, term: "Ukuran Lokasi (Tendensi Sentral)", definition: "Metrik yang mendeskripsikan titik pusat kumpulan data, utamanya terdiri dari Mean, Median, dan Mode." },
      { id: 29, term: "Kelebihan dan Kelemahan Rata-rata (Mean)", definition: "Memanfaatkan seluruh nilai observasi secara unik, namun sangat terpengaruh dan sensitif terhadap nilai ekstrem (outlier)." },
      { id: 30, term: "Sifat Mutlak Rata-rata Aritmatika", definition: "Jumlah keseluruhan titik deviasi (selisih) antara setiap nilai individual terhadap nilai rata-ratanya selalu bernilai nol." },
      { id: 31, term: "Rumus Mean Populasi vs Mean Sampel", definition: "Mean Populasi ($\\mu$) dirumuskan $\\mu = \\frac{\\Sigma x}{N}$. Mean Sampel ($\\bar{x}$) dirumuskan $\\bar{x} = \\frac{\\Sigma x}{n}$." },
      { id: 32, term: "Median", definition: "Titik tengah data setelah diurutkan dari minimum ke maksimum. Median kebal terhadap nilai ekstrem dan mensyaratkan minimal skala ukur ordinal. Jika genap, dihitung rata-rata dari dua nilai tengah." },
      { id: 33, term: "Mode", definition: "Nilai dengan frekuensi kemunculan tertinggi. Bisa diterapkan pada data nominal, dan satu set data dapat memiliki lebih dari satu mode atau tidak ada sama sekali." },
      { id: 34, term: "Hubungan Kurva dengan Mean, Median, dan Mode", definition: "Distribusi Simetris (Mean = Median = Mode). Positive Skew (Mean > Median). Negative Skew (Mean < Median)." },
      { id: 35, term: "Weighted Mean (Rata-rata Berbobot)", definition: "Mengalikan setiap observasi dengan bobotnya lalu dibagi total bobot. Rumus: $\\bar{x}_w = \\frac{\\Sigma (w \\cdot x)}{\\Sigma w}$." },
      { id: 36, term: "Geometric Mean (Fungsi & Syarat)", definition: "Berfungsi mencari rata-rata tingkat perubahan seiring waktu dan tidak akan melebihi rata-rata aritmatika. Mensyaratkan nilai harus positif." },
      { id: 37, term: "Geometric Mean Tingkat Perubahan (Rumus)", definition: "Wajib mengubah format persentase menjadi rasio $1.0 + \\text{perubahan}$ untuk mencegah gagal hitung akibat rasio negatif. Rumus rasionya: $GM = \\sqrt[n]{(x_1)(x_2)...(x_n)}$." },
      { id: 38, term: "Geometric Mean Awal-Akhir (Rumus)", definition: "Melacak perbandingan linier titik akhir terhadap titik pangkal. Rumus: $GM = \\sqrt[n]{\\frac{\\text{Value at end of period}}{\\text{Value at start of period}}} - 1$." },
      { id: 39, term: "Ukuran Dispersi", definition: "Metrik yang mengukur rentang variasi dan penyebaran sekumpulan data, karena tendensi sentral saja tidak cukup." },
      { id: 40, term: "Range (Rentang)", definition: "Selisih antara nilai maksimum dan nilai minimum, yang kelemahannya sangat dipengaruhi oleh nilai ekstrem." },
      { id: 41, term: "Varians Populasi", definition: "Rata-rata kuadrat deviasi dari mean. Dirumuskan: $\\sigma^2 = \\frac{\\Sigma (x - \\mu)^2}{N}$." },
      { id: 42, term: "Standar Deviasi Populasi", definition: "Akar kuadrat dari varians ($\\sigma = \\sqrt{\\sigma^2}$) yang berfungsi untuk mengembalikan satuan pengukur ke bentuk aslinya." },
      { id: 43, term: "Varians & Standar Deviasi Sampel", definition: "Dirumuskan menggunakan penyebut $n-1$ (sebagai faktor koreksi estimasi populasi). Rumus: $s^2 = \\frac{\\Sigma (x - \\bar{x})^2}{n-1}$." },
      { id: 44, term: "Teorema Chebyshev", definition: "Mengestimasi penyebaran untuk semua bentuk distribusi data. Menyatakan bahwa proporsi minimum nilai di dalam $k$ standar deviasi dari rata-rata dirumuskan sebesar $1 - \\frac{1}{k^2}$." },
      { id: 45, term: "Empirical Rule (Normal Rule)", definition: "Estimasi khusus untuk distribusi simetris berbentuk lonceng. Menyatakan bahwa rentang $\\mu \\pm 1\\sigma$ memuat 68%, $\\mu \\pm 2\\sigma$ memuat 95%, dan $\\mu \\pm 3\\sigma$ memuat 99.7% observasi." },
      // MODUL 2/TOPIK 4: Konsep Dasar Probabilitas
      { id: 46, term: "Definisi Probabilitas, Eksperimen, Hasil (Outcome), dan Kejadian (Event)", definition: "Probabilitas adalah rentang nilai inklusif 0 (mustahil) hingga 1 (pasti). Eksperimen adalah proses mengarah pada satu kepastian, Hasil adalah output spesifik dari eksperimen, dan Kejadian adalah kumpulan kemungkinan hasil." },
      { id: 47, term: "Pendekatan Probabilitas Klasik (Objektif)", definition: "Berasumsi seluruh hasil memiliki peluang sama besar. Dihitung dari: Hasil menguntungkan / Total hasil yang mungkin." },
      { id: 48, term: "Pendekatan Probabilitas Empiris (Objektif)", definition: "Berdasarkan frekuensi relatif observasi nyata masa lalu. Dilandasi oleh Hukum Bilangan Besar (Law of Large Numbers), di mana repetisi eksperimen skala masif akan menggeser empiris mendekati ekuivalibrium probabilitas sebenarnya." },
      { id: 49, term: "Pendekatan Probabilitas Subjektif", definition: "Estimasi berdasarkan opini individu saat terjadi ketiadaan data historis." },
      { id: 50, term: "Rumus Perkalian Susunan (Aturan Total Hasil)", definition: "Limit konfigurasi kombinasi kejadian independen dikalkulasikan dengan relasi perkalian $(m)(n)$." },
      { id: 51, term: "Permutasi", definition: "Susunan objek di mana urutan (orde) sangat diperhitungkan. Rumus: $^nP_r = \\frac{n!}{(n-r)!}$." },
      { id: 52, term: "Kombinasi & Koreksi Overcounting", definition: "Susunan objek tanpa mengurutkan letak (urutan tidak relevan). Menggunakan penyebut faktorial $r!$ ekstraksional demi mengeliminasi overcounting ganda dari permutasi. Rumus: $^nC_r = \\frac{n!}{r!(n-r)!}$." },
      { id: 53, term: "Kejadian Mutually Exclusive & Collectively Exhaustive", definition: "Mutually Exclusive: Jika kejadian A terjadi, B tidak dapat terjadi bersamaan. Collectively Exhaustive: Minimal satu kejadian harus muncul dalam eksperimen." },
      { id: 54, term: "Aturan Penjumlahan Khusus & Aturan Komplemen", definition: "Penjumlahan Khusus (syarat Mutually Exclusive): $P(A \\text{ or } B) = P(A) + P(B)$. Aturan Komplemen: $P(A) = 1 - P(\\sim A)$." },
      { id: 55, term: "Aturan Penjumlahan Umum", definition: "Diterapkan jika kejadian TIDAK mutually exclusive. Mengurangi nilai irisan (Joint Probability) untuk mencegah penghitungan ganda. Rumus: $P(A \\text{ or } B) = P(A) + P(B) - P(A \\text{ and } B)$." },
      { id: 56, term: "Aturan Perkalian Khusus vs Umum", definition: "Khusus (Untuk kejadian Independen): $P(A \\text{ and } B) = P(A) \\cdot P(B)$. Umum (Untuk kejadian Dependen/Bersyarat): $P(A \\text{ and } B) = P(A) \\cdot P(B|A)$." },
      { id: 57, term: "Tabel Kontingensi & Diagram Pohon (Tree Diagram)", definition: "Tabel kontingensi tabulasi silang untuk klasifikasi dua variabel simultan. Diagram pohon adalah pemetaan visual logika bersyarat, di mana simpul merepresentasikan tahap masalah dan garis merutekan alokasi probabilitas." },
      { id: 58, term: "Teorema Bayes", definition: "Arsitektur matematika untuk merevisi/mengubah probabilitas inisial (Prior Probability) menjadi probabilitas tervalidasi setelah adanya bukti/indikator baru (Posterior Probability)." },
      // MODUL 3/TOPIK 5: Distribusi Probabilitas Diskrit
      { id: 59, term: "Variabel Acak Diskrit vs Kontinu", definition: "Diskrit mengasumsikan nilai terpisah dengan celah yang jelas (berbasis penghitungan), sedangkan Kontinu mengasumsikan fraksi atau desimal tanpa batas di suatu rentang (berbasis pengukuran)." },
      { id: 60, term: "Mean (Nilai Harapan) Distribusi Diskrit", definition: "Mengukur lokasi sentral data diskrit berdasar bobot peluang. Rumus: $\\mu = \\Sigma [x \\cdot P(x)]$." },
      { id: 61, term: "Varians Distribusi Diskrit", definition: "Mengukur dispersi penyebaran bobot peluang diskrit. Rumus: $\\sigma^2 = \\Sigma [(x - \\mu)^2 \\cdot P(x)]$." },
      { id: 62, term: "Distribusi Binomial (Karakteristik)", definition: "Mengkalkulasi eksperimen dengan 4 syarat ketat: jumlah ulangan ($n$) tetap, saling independen, hanya dua klasifikasi hasil mutually exclusive (sukses/gagal), dan peluang sukses ($\\pi$) konstan." },
      { id: 63, term: "Rumus Distribusi Binomial", definition: "$P(x) = \\frac{n!}{x!(n-x)!} \\pi^x (1-\\pi)^{n-x}$. Mean Binomial adalah $\\mu = n\\pi$ dan variansnya $\\sigma^2 = n\\pi(1-\\pi)$." },
      { id: 64, term: "Distribusi Hipergeometrik", definition: "Sama seperti Binomial (dua hasil mutually exclusive), namun diterapkan saat sampel ditarik tanpa pengembalian (without replacement) sehingga peluang sukses berubah dinamis." },
      { id: 65, term: "Rumus Distribusi Hipergeometrik", definition: "$P(x) = \\frac{(^S C_x)(^{N-S} C_{n-x})}{^N C_n}$." },
      { id: 66, term: "Distribusi Poisson", definition: "Distribusi diskrit untuk mengukur independensi jumlah kemunculan kejadian sukses yang proporsional di dalam batasan interval kontinu spesifik, seperti waktu, luas, atau jarak." },
      { id: 67, term: "Rumus Distribusi Poisson", definition: "$P(x) = \\frac{\\mu^x e^{-\\mu}}{x!}$." },
      // MODUL 3/TOPIK 6: Distribusi Probabilitas Kontinu
      { id: 68, term: "Distribusi Seragam (Uniform Distribution)", definition: "Kurva probabilitas berbentuk persegi panjang lurus tegak, terjadi akibat seluruh rentang observasi memiliki ekspektasi peluang kejadian yang identik merata." },
      { id: 69, term: "Rumus Distribusi Seragam (Mean, SD, dan Probabilitas)", definition: "Mean $\\mu = \\frac{a+b}{2}$. Standar Deviasi $\\sigma = \\sqrt{\\frac{(b-a)^2}{12}}$. Area Probabilitasnya $P(x) = \\frac{1}{b-a}$." },
      { id: 70, term: "Karakteristik Distribusi Normal", definition: "Konsep terpenting variabel kontinu berwujud kurva lonceng simetris sempurna di tengah (Mean = Median = Mode), ekornya tak berbatas secara asimtotik, dan luas area mutlaknya bernilai 1." },
      { id: 71, term: "Distribusi Normal Standar (Z-Distribution)", definition: "Translasi kurva normal universal di mana Mean dipusatkan di angka 0 dan Standar Deviasinya menjadi 1, memungkinkan pembakuan varians mandiri." },
      { id: 72, term: "Rumus Nilai Z (Z-Score)", definition: "Mengekspresikan total jarak standar deviasi di atas/bawah rata-rata aslinya. Rumus: $z = \\frac{x - \\mu}{\\sigma}$." },
      { id: 73, term: "Aproksimasi Normal terhadap Binomial", definition: "Pendekatan kurva kontinu (Normal) untuk menyelesaikan eksperimen diskrit (Binomial) apabila ukuran sampel besar, ditandai syarat minimum $n\\pi \\ge 5$ dan $n(1-\\pi) \\ge 5$." },
      { id: 74, term: "Faktor Koreksi Kontinuitas", definition: "Persyaratan kalibrasi batas interval sebesar $\\pm 0.5$ guna melebarkan titik diskrit tunggal menjadi sebuah area luasan kontinu di bawah kurva saat melakukan aproksimasi Normal." },
      { id: 75, term: "Distribusi Eksponensial", definition: "Penyeimbang kontinu dari distribusi Poisson, berfungsi menghitung dengan presisi ekspektasi kelambatan atau jeda waktu antar kemunculan dua kejadian yang saling mengikuti." },
      { id: 76, term: "Rumus Distribusi Eksponensial", definition: "$P(x) = \\lambda e^{-\\lambda x}$." },
    ],
    quiz: statistikQuiz,
  },

  biseko: {
    materi: [
      { id: 1, title: "The Economics and Business Environment", driveId: "1LLunzhpgrjIDfMKIIgKUwl9FfYJbVUSMGVZkZiIpc2I", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Business Organisations", driveId: "1ni_bAC4XwfAqxlXFKB_WclG-yVkc8i9qIgRuLBTOgRE", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "The Consumer and Demand", driveId: "1VRgtJn_qiJMkgdRRQqVx_mDlDq71dCpu8W2aYHUx90M", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "The Working of Price Elasticity Using AI in Competitive Markets", driveId: "1V3wmxWIcHpa9kI06ykW3tGB_6W3nz7bXlWBCY_0yjKc", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Costs of Production", driveId: "1rF7yN6GNSK9knMa7G6aOYlQh9CLB4slKybwskSypS04", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "Revenue and Profit", driveId: "1QnxSN4YQwdSildRBx3UZIerVWRvsh-h2u5uTHzFaEbQ", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Profit Maximisation Under Perfect Competition and Monopoly", driveId: "1xobPa-Q1Z2VJN9-GETCmkdBjo9zU4RinMMhbhcBmg5U", type: "drive-gslides", session: "7-8", xp: 10 },
      { id: 8, title: "Business in a Competitive Market", driveId: "1c5keXgQiPAxSEiMEArQA3OwHsS9eFOw-urhrZx-r78o", type: "drive-gslides", session: "9", xp: 10 },
      { id: 9, title: "Digital Marketing Using AI as Alternative Aims Marketing Strategy", driveId: "180lGg946jCk1StqnlnD8PZypOBmQCY9nQWFbJQuTKTY", type: "drive-gslides", session: "10", xp: 10 },
      { id: 10, title: "Profit Maximisation Under Imperfect Competition", driveId: "1noJAlecisms8H7KLEZ0v8r9Itvy2R7v42nio9ijTz_c", type: "drive-gslides", session: "11-12", xp: 10 },
      { id: 11, title: "Multinational Corporations in a Global Economy Used AI", driveId: "1nv-HlC_IWXVfwv84dQm_r8ozxcXZQ7cp-0xZQea2xo0", type: "drive-gslides", session: "13", xp: 10 },
      { id: 12, title: "Business Strategy in a Global Economy", driveId: "1wuqhJL6qMBcwRivuOCUPWx-zJtthODz5uTaKgA1Zons", type: "drive-gslides", session: "14", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Analisis PESTEL: Makroekonomi", items: ["Analisis PESTEL/STEEPLE dengan fokus pada faktor makroekonomi"] },
      { topic: "Demand and Supply: 4 Jenis Pasar", items: ["Perfect Competition", "Monopoly (Imperfect Competition)", "Oligopoly", "Monopolistic Competition"] },
      { topic: "Hitungan", items: ["Revenue dan Profit", "Profit Maximisation Under Imperfect Competition (sesi 11 & 12)"] },
      { topic: "Game Theory", items: ["Oligopoly Game Theory"] },
    ],
    kisiKisiNote: "Format: Essay (soal hitungan pasti ada). Sumber: LB86.",
    flashcards: bisekoFlashcards,
    quiz: bisekoQuiz,
  },

  cbkwn: {
    materi: [
      { id: 1, title: "Introduction to Civics Education", driveId: "18YKXhEKgx9HrTV9bUNaQ0wKje2aJFMMh9iZ42yTbxLs", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Values and Social Norms", driveId: "1vWDcEhJJnLG5YY0WoGQ5awjm-G2-zPtJJD7_TJH602k", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "State and Constitution", driveId: "1RGANnNYxIKYVlQPlxTR5sDMpTmdZrsU8-HtlvM6NCrM", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "The Rights and Obligations of the State and Its Citizens", driveId: "1bT7Kfziut3UqdFQ-I04v_U70u1hnPmViNEQKMZ7GY0k", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Law Enforcement in Indonesia", driveId: "1qcYHX2UbMh8uPDLS1ER7axf5zHzLXxQgPUrDpaREQ3s", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "The Dynamics of Democracy in Indonesia", driveId: "1Z74zyZUyggUM2ya9saHkgBA5gPHMfg3T85kQTCiLGmg", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Wawasan Nusantara", driveId: "1Fzp3N1g_Uj57_t8Ljprr55iLfAFPntwzljY7OsI48mA", type: "drive-gslides", session: "7", xp: 10 },
    ],
    kisiKisi: [],
    kisiKisiNote: "Ujian mata kuliah ini dilaksanakan secara online. Silakan kunjungi exam.apps.binus.ac.id untuk informasi lebih lanjut.",
    flashcards: [
      { id: 1, term: "Pancasila", definition: "Dasar negara dan ideologi bangsa Indonesia yang terdiri dari lima sila" },
      { id: 2, term: "UUD 1945", definition: "Undang-Undang Dasar Republik Indonesia sebagai hukum dasar tertinggi" },
      { id: 3, term: "Hak Asasi Manusia", definition: "Hak dasar yang melekat pada diri manusia sejak lahir" },
    ],
    quiz: [
      { id: 1, question: "Sila pertama Pancasila adalah?", options: ["Kemanusiaan yang adil", "Ketuhanan Yang Maha Esa", "Persatuan Indonesia", "Kerakyatan"], answer: 1, category: "Module 2" },
    ],
  },

  akuntansi: {
    materi: [
      { id: 1, title: "Introduction to Financial Statements", driveId: "1LcbiKXHUAYLXdUEqD0D0tK91pUyTmg5Gy1qYCe6LM5o", type: "drive-gslides", session: "1-2", xp: 10 },
      { id: 2, title: "The Accounting Information System", driveId: "1XEurk_BdkOEagXF-cgRl8YlRy2Auo7jLciyLCIH0cI0", type: "drive-gslides", session: "3-4", xp: 10 },
      { id: 3, title: "Accrual Accounting Concepts", driveId: "1aoODbRPZRCiYHPFu1Ihja8ZynSH2Gs-k3MklG3hAfc0", type: "drive-gslides", session: "5-6", xp: 10 },
      { id: 4, title: "Merchandising Operations and the Multiple-Step Income Statement", driveId: "1AR_HcOXxPXl1GeZHmJg2PpVUl1nGcqWVeiND_rKk0Es", type: "drive-gslides", session: "7-8", xp: 10 },
      { id: 5, title: "Fraud, Internal Control, and Cash", driveId: "1VwlgNlumK0iFGNM_oJueRe009SbQPje4sf2ekxbxicw", type: "drive-gslides", session: "9-10", xp: 10 },
      { id: 6, title: "Statement of Cash Flows", driveId: "1A9KZKpcv7SxXbS83PkR_hSlSS6Cil1HX6eUwL7a_5EI", type: "drive-gslides", session: "11-12", xp: 10 },
      { id: 7, title: "Financial Analysis: The Big Picture", driveId: "1JxsMOoFx2pVze-EXriAOsrkCo7pdYP0xhYQxtMsIlRg", type: "drive-gslides", session: "13-14", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Bagian 1: Teori (Bobot 50%)", items: [
        "Pengantar Laporan Keuangan (Sesi 1) — Memahami berbagai macam laporan keuangan dasar (Financial Statements). Komponen utama: Laporan Laba Rugi, Laporan Perubahan Ekuitas, Neraca, dan Laporan Arus Kas.",
        "Fraud, Internal Control, & Cash (Sesi 5 - Bab 7) — Fraud: Definisi dan faktor penyebab. Internal Control: Ciri pengendalian yang bagus, terutama adanya pengawasan ketat terhadap aset perusahaan. Cash: Petty Cash (pengelolaan kas kecil) dan Bank Reconciliation (rekonsiliasi antara catatan bank dan catatan perusahaan).",
        "Statement of Cash Flows (Sesi 5 - Bab 12) — Kegunaan: Mengapa laporan arus kas penting bagi pengguna informasi keuangan. Klasifikasi Arus Kas: Aktivitas Operasi, Investasi, dan Pendanaan. Metode Penyajian: Perbedaan antara Metode Langsung (Direct) dan Metode Tidak Langsung (Indirect). Format: Memahami struktur pelaporan untuk kedua metode tersebut.",
        "Further Financial Statement (Bab 2) — Pendalaman struktur laporan keuangan yang lebih kompleks.",
      ] },
      { topic: "Bagian 2: Cases / Praktika (Bobot 50%)", items: [
        "Siklus Akuntansi Perusahaan Jasa (Bab 2) — Fokus pada penjurnalan transaksi umum, contohnya: Pembayaran Hutang: (D) Accounts Payable, (K) Cash. Pendapatan Jasa (Kredit): (D) Accounts Receivable, (K) Service Revenue. Pembelian Perlengkapan (Tunai): (D) Supplies, (K) Cash.",
        "Jurnal Penyesuaian / Adjusting Entries (Bab 3) — 5 kategori akun utama: Prepaid Expense (beban dibayar dimuka), Unearned Revenue (pendapatan diterima dimuka), Accrued Revenue (pendapatan yang masih harus diterima), Accrued Expense (beban yang masih harus dibayar), Depreciation (penyusutan aset tetap).",
        "Laporan Laba Rugi / Income Statement (Bab 4) — Penyusunan laporan laba rugi dalam format Multiple-Step. Memisahkan antara pendapatan/beban operasional dan non-operasional untuk mendapatkan Laba Kotor (Gross Profit) dan Laba Bersih (Net Income).",
        "Analisis Rasio Keuangan (Bab 13) — Menghitung rasio keuangan berdasarkan data laporan yang disediakan. Kategori rasio: Rasio Likuiditas, Profitabilitas, dan Solvabilitas.",
      ] },
    ],
    kisiKisiNote: "",
    flashcards: akuntansiFlashcards,
    quiz: akuntansiQuiz,
  },

  foundai: {
    materi: [
      { id: 1, title: "Introduction to AI", driveId: "1aFgoRe1OoMn-9k2UwS68Yka66fgm0CcKzSK50MwZDqQ", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Machine Learning Fundamental", driveId: "14gRF1T7IyXyKWNjw-YcekG3caFXg6jCUJtdkHWnnBQM", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "AI and Data", driveId: "1rE1rP2Uss_8hqs4K5hZkQEpU5i9WhpR86wp4_TWLBKA", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "Natural Language Processing", driveId: "1unbo9M70v1DBx8orx5Tn82rX6wwrwHrQfyiKRDlq0jY", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Speech Recognition", driveId: "1Nymy9b3ikMAWdLcScYWdsngN9t9q2xDnSrWzWnCyvXw", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "Computer Vision", driveId: "1_f5pxwebXV-VQ3nBAHwj48MI9Ci1fMH4HyhbK1znT1Y", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Video Processing", driveId: "1sLyJNc-gFE6qjvSNSBu9fAGE5wiVwHTjiZV1iMtUPrs", type: "drive-gslides", session: "7", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Bagian 1: True or False (Benar atau Salah)", items: [
        "Kamu harus menentukan apakah sebuah pernyataan itu benar atau salah.",
        "Wajib menyertakan alasan yang logis dan berdasar untuk setiap jawaban yang dipilih.",
      ] },
      { topic: "Bagian 2: Essay (Analisis Kasus Aplikatif)", items: [
        "Akan diberikan sebuah studi kasus aplikatif yang di dalamnya terdapat kesalahan konsep AI.",
        "Identifikasi dan temukan di mana letak kesalahan konsep tersebut.",
        "Berikan alasan mengapa hal tersebut dianggap salah.",
        "Jelaskan teori dasar yang tepat untuk memperbaiki kesalahan tersebut.",
      ] },
      { topic: "Bagian 3: Case Study (Studi Kasus)", items: [
        "Format dan pendekatan soal mirip dengan Bagian 2.",
        "Fokus pada analisis komprehensif dengan pendekatan What (apa masalahnya), Why (kenapa bisa terjadi/kenapa itu salah), dan How (bagaimana cara atau teori untuk menyelesaikannya).",
      ] },
    ],
    kisiKisiNote: "Topik spesifik untuk masing-masing soal tidak diberikan secara detail, namun format pengerjaannya adalah sebagai berikut. Sumber: LC86.",
    flashcards: foundaiFlashcards,
    quiz: foundaiQuiz,
  },
};

export function getContentBySubjectId(subjectId: string): SubjectContent | undefined {
  return content[subjectId];
}
