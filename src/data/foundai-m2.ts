export const foundaiModule2 = `
<h1>Modul 2: AI & Data dan Natural Language Processing (Sesi 3 & 4)</h1>

<h2>Sesi 3: AI dan Data</h2>
<bullet><b>Piramida Data:</b> Pemodelan struktural hierarkis yang mengklasifikasikan hubungan operasional berjenjang dari level dasar Data, bertransformasi menjadi Informasi, Pengetahuan, hingga Kebijaksanaan (Wisdom). Peningkatan setiap tahapan menciptakan nilai baru untuk memberikan solusi pada kompleksitas persoalan tingkat tinggi (lihat materi sesi 3, slide "Data pyramid").</bullet>
<bullet><b>Data Mining (KDD):</b> Proses pencarian pola, model, dan ekstraksi pengetahuan menarik dari kumpulan data berskala masif. Terminologi alternatif mencakup Knowledge Discovery from Data (KDD), penemuan pola, ekstraksi pengetahuan, atau analitik data. Tindakan mengunduh teks secara acak di web (scraping/crawling) bukan bagian dari data mining. Contoh valid terlihat pada algoritma Google Flu Trends yang menemukan korelasi antara tingginya intensitas pencarian kata kunci flu di internet dengan lonjakan pasien bergejala flu fisik.</bullet>
<bullet><b>Proses Knowledge Discovery:</b> Arsitektur pemrosesan memiliki rute hierarkis: Persiapan Data (Pembersihan, Integrasi, Transformasi, Seleksi), eksekusi algoritma Data Mining, Evaluasi Pola/Model, dan tahap akhir Presentasi Pengetahuan (lihat materi sesi 3, slide "Knowledge discovery from data").</bullet>

<h3>Klasifikasi Keberagaman Data:</h3>
<bullet><b>Terstruktur:</b> Data dengan format baris dan kolom terstandardisasi (database SQL, lembar kerja matriks).</bullet>
<bullet><b>Tidak Terstruktur:</b> Data mentah tanpa hierarki terdefinisi (teks panjang, file audio, gambar, video).</bullet>
<bullet><b>Semi-Terstruktur:</b> Data dengan arsitektur penengah, tidak memiliki struktur tabular relasional namun lebih mudah diekstrak dibanding bentuk tidak terstruktur (file JSON, XML, lampiran surel) (lihat materi sesi 3, slide "Semi-structured data example: XML vs JSON").</bullet>
<bullet><b>Karakteristik Spesifik Aplikasi:</b> Entitas data memiliki ragam profil seperti deret sekuensial (riwayat keranjang belanja), time-series periodik berkelanjutan, rentang temporal-spasial, hingga pemetaan grafis jejaring sosial.</bullet>

<h3>Ragam Ekstraksi Pengetahuan:</h3>
<bullet><b>Pola Umum (Frequent Patterns) & Asosiasi:</b> Identifikasi probabilitas kemunculan item secara bersamaan. Contoh bisnis: Sistem ritel mendeteksi tren konsumen yang selalu membeli produk roti bersamaan dengan selai.</bullet>
<bullet><b>Klasifikasi & Regresi:</b> Analisis penyusunan model instruksi dari data pelatihan guna meramalkan label kelas di masa mendatang (mengklasifikasikan kategori negara berdasar iklim atau mobil berdasar jarak tempuh bahan bakar).</bullet>
<bullet><b>Analisis Klaster (Unsupervised):</b> Pemisahan data tanpa identitas kelas baku ke dalam klaster baru. Prinsip kerja memusatkan pemaksimalan kemiripan internal di dalam klaster yang sama dan minimalisasi kemiripan dengan klaster eksternal (lihat materi sesi 3, slide "Cluster analysis").</bullet>
<bullet><b>Analisis Outlier:</b> Pelacakan entitas anomali ekstrem yang menyimpang dari standar norma kumpulan data umum (noise atau eksepsi khusus). Sistem ini diimplementasikan untuk investigasi penipuan perbankan tingkat tinggi (lihat materi sesi 3, slide "Outlier analysis").</bullet>
<bullet><b>Evaluasi Metrik Pengetahuan:</b> Validasi utilitas hasil algoritma diukur menggunakan instrumen penilaian kemenarikan (interestingness measure). Tahapan ini bertujuan membuang serpihan pola non-representatif, bersifat temporer terbatas, maupun cacat dimensi.</bullet>
<bullet><b>Implementasi dan Implikasi Sosial:</b> Pemanfaatan data mining merambah manajemen bisnis tingkat korporat, recommender systems, pemasaran bertarget otomatis, deteksi keamanan siber (real time), serta sinkronisasi medis biologis. Penggunaan ekstensif ini berisiko memicu bencana pengungkapan profil personal (Data Leaks) tanpa izin. Solusi bertumpu pada penguatan sistem keamanan basis privasi publikasi untuk mencegah penyalahgunaan aset konfidensial negara dan individu (lihat materi sesi 3, slide "Data Mining and Society").</bullet>

<h2>Sesi 4: Natural Language Processing</h2>
<bullet><b>Pengantar Natural Language Processing (NLP):</b> NLP merupakan cabang studi teknologi kecerdasan pengajaran sistem komputasi guna mengenali, menganalisis, serta menginterpretasi makna kontekstual bahasa manusia (termasuk ekspresi slang dan deteksi sentimen emosional). Urgensi sistem ini didorong oleh lalu lintas jutaan pesan elektronik dan produksi lebih dari 30 miliar laman web di internet dari miliaran pengguna perangkat global per hari (lihat materi sesi 4, slide "Why Natural Language Processing?").</bullet>
<bullet><b>Komponen Arsitektur NLP:</b> Sistem dipisah ke dalam dua struktur terpadu (lihat materi sesi 4, slide "What is Natural Language Processing?"):</bullet>
<bullet><b>NLU (Natural Language Understanding):</b> Translasi bahasa manusia mentah menjadi format struktur bacaan logis mesin.</bullet>
<bullet><b>NLG (Natural Language Generation):</b> Rekonstruksi data biner terstruktur menjadi susunan linguistik manusia alamiah.</bullet>
<bullet><b>Evolusi Large Language Model (LLM):</b> Linimasa teknologi bahasa bermutasi dari era Rule Based statis tahun 1950, berlanjut menuju pendekatan model statistik, era Deep Learning, hingga kemunculan Large Language Models pasca 2019 (lihat materi sesi 4, slide "Timeline of NLP developments"). LLM memuat miliaran parameter terlatih untuk kapabilitas identifikasi konteks dan kemudahan Transfer Learning. Inovasi LLM 2025 melahirkan DeepSeek R1 (penekanan limitasi beban GPU via modul rasionalisasi), model alat integrasi spesifik gpt-oss OpenAI, dan pembaruan Llama 4 (diikuti anomali distorsi metrik benchmaxxing pada performa fungsional di lapangan nyata).</bullet>

<h3>Cabang Analisis Teks (Text Analysis):</h3>
<bullet><b>Analisis Sentimen:</b> Mekanisme pengklasifikasian opini tekstual murni ke dalam kategori matriks sentimen positif, negatif, atau netral. Korporasi menggunakan alat Social Media Listening (Hootsuite, Brandwatch, Awario) untuk kalkulasi opini publik terkait indeks kepuasan pelanggan secara kontinu (lihat materi sesi 4, slide "Sentiment analysis").</bullet>

<h3>Cabang Generasi Teks (Text Generation):</h3>
<bullet><b>Chatbots:</b> Simulasi asisten percakapan interaktif melalui platform pertukaran teks atau suara layaknya entitas pelanggan manusia (Siri, Google Assistant, ChatGPT).</bullet>
<bullet><b>Captioning Media:</b> Produksi penulisan deskriptif akurat untuk visualisasi objek tunggal atau video tayangan utuh, tanpa metode speech-to-text melainkan sistem pengenalan murni atas interaksi dan letak objek gambar (lihat materi sesi 4, slide "Image captioning").</bullet>
<bullet><b>Terjemahan Mesin (Machine Translation):</b> Penyeberangan silang makna algoritma bahasa untuk mitigasi kendala lokalisasi komunikasi (optimal pada ketersediaan kumpulan data besar seperti bahasa Inggris, Spanyol, Prancis, Mandarin).</bullet>
<bullet><b>Peringkasan (Summarization):</b> Formulasi pemadatan teks ekstensif. Sistem mengeksekusi metode Ekstraktif (pemilihan dan penggabungan kalimat orisinil naskah) dan pendekatan Abstraktif (penciptaan sintesis untaian kalimat baru untuk representasi inti dokumen) (lihat materi sesi 4, slide "Summarization").</bullet>

<bullet><b>Prompt Engineering Dasar:</b> Prompt adalah input pemicu komunikasi berstruktur yang diarahkan langsung ke dalam inti program AI untuk menghasilkan target objektif spesifik. Eksekusi krusial menuntut adanya empat elemen (lihat materi sesi 4, slide "Components of effective prompt"):</bullet>
<bullet><b>Persona:</b> Karakter identitas fiktif sebagai mode adopsi peran mesin.</bullet>
<bullet><b>Tugas (Task):</b> Sasaran perintah aksi absolut (penggunaan wajib blok kata kerja).</bullet>
<bullet><b>Konteks:</b> Perincian latar belakang spesifik dan batas cakupan diskusi logis.</bullet>
<bullet><b>Format Luaran:</b> Susunan presentasi visual jawaban spesifik (bentuk tabel, daftar bulet, surat).</bullet>
<bullet><b>Tips Penyusunan Prompt:</b> Gunakan pembahasaan natural kalimat penuh; lakukan instruksi bimbingan spesifik secara berulang dengan batasan cegah (constraints); buat parameter tetap padat menghindari kerumitan jargon; modifikasi hasil iteratif sebagai percakapan bertahap; serta masukkan referensi berkas dokumen mandiri sebagai landasan informasi personalisasi.</bullet>
<bullet><b>Limitasi Keamanan Generative AI:</b> Arsitektur Generative AI rawan memberikan respons yang tidak dapat diprediksi seutuhnya. Peninjauan kejernihan, tingkat relevansi, serta akurasi secara mutlak bersandar pada proses verifikasi manual manusia sebelum luaran didistribusikan.</bullet>
`;
