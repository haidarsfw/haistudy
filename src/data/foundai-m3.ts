export const foundaiModule3 = `
<h1>Modul 3: Speech Recognition, Computer Vision, & Video Processing (Sesi 5, 6, & 7)</h1>

<h2>Sesi 5: Speech Recognition</h2>

<h3>Definisi dan Mekanisme Dasar</h3>
<bullet>Speech Recognition (pengenalan ucapan) adalah kemampuan program untuk mengidentifikasi kata dan frasa dalam bahasa lisan dan mengubahnya menjadi format yang dapat dibaca mesin. Komponen dasarnya melibatkan perangkat keras untuk menangkap sinyal suara dan perangkat lunak untuk memprosesnya menjadi teks digital. Bidang ini merupakan irisan dari linguistik, ilmu komputer, dan teknik elektro.</bullet>

<h3>Komponen Utama</h3>
<bullet><b>Perangkat Keras:</b> Mikrofon sebagai alat penangkap input suara fisik.</bullet>
<bullet><b>Perangkat Lunak:</b> Algoritma yang melakukan ekstraksi fitur dan pemodelan bahasa untuk mencocokkan pola suara dengan kata-kata.</bullet>

<h3>Cara Kerja Sistem</h3>
<bullet>Proses dimulai dengan penangkapan gelombang suara lisan oleh perangkat keras. Sinyal suara tersebut kemudian diubah menjadi data digital. Perangkat lunak akan memecah data menjadi unit suara terkecil (fonem) dan menggunakan model statistik atau saraf untuk menentukan kata yang paling mungkin dimaksud. Konteks kalimat digunakan untuk memperbaiki akurasi interpretasi.</bullet>

<h3>Aplikasi Speech Recognition</h3>
<bullet><b>Asisten Virtual:</b> Penggunaan kontrol suara pada perangkat seperti Siri, Alexa, dan Google Assistant.</bullet>
<bullet><b>Dikte Medis:</b> Transkripsi otomatis catatan dokter untuk efisiensi administrasi kesehatan.</bullet>
<bullet><b>Layanan Pelanggan:</b> Sistem IVR (Interactive Voice Response) untuk mengarahkan panggilan secara otomatis.</bullet>
<bullet><b>Aksesibilitas:</b> Membantu penyandang disabilitas motorik atau penglihatan untuk mengoperasikan perangkat melalui suara.</bullet>

<h3>Tantangan Teknis</h3>
<bullet>Akurasi sistem dipengaruhi oleh beberapa faktor kritis: latar belakang suara yang bising, variasi aksen atau dialek pengguna, kecepatan bicara, dan kualitas perangkat keras penangkap suara.</bullet>

<h2>Sesi 6: Computer Vision</h2>

<h3>Pengantar Computer Vision</h3>
<bullet>Bidang ini berfokus pada pengembangan teknik untuk memungkinkan komputer "melihat" dan memahami konten gambar digital atau video. Tujuannya adalah untuk menduplikasi kemampuan sistem visual manusia dalam mengenali objek, wajah, dan lingkungan.</bullet>

<h3>Hierarki Pemrosesan Visual</h3>
<bullet><b>Pemrosesan Tingkat Rendah:</b> Ekstraksi fitur dasar seperti deteksi tepi, tekstur, dan warna.</bullet>
<bullet><b>Pemrosesan Tingkat Menengah:</b> Segmentasi gambar dan deteksi bentuk untuk memisahkan objek dari latar belakang.</bullet>
<bullet><b>Pemrosesan Tingkat Tinggi:</b> Pengenalan objek dan pemahaman adegan secara menyeluruh.</bullet>

<h3>Tugas Utama dalam Computer Vision</h3>
<bullet><b>Klasifikasi Gambar:</b> Menentukan kategori utama dari sebuah gambar (contoh: ini adalah gambar kucing).</bullet>
<bullet><b>Deteksi Objek:</b> Mengidentifikasi lokasi objek tertentu dalam gambar menggunakan kotak pembatas (bounding boxes).</bullet>
<bullet><b>Segmentasi Semantik:</b> Mengklasifikasikan setiap piksel gambar ke dalam kategori kelas tertentu.</bullet>
<bullet><b>Pengenalan Wajah:</b> Mengidentifikasi atau memverifikasi identitas individu melalui fitur wajah.</bullet>

<h3>Arsitektur Model</h3>
<bullet>Convolutional Neural Networks (CNN) adalah arsitektur dominan yang digunakan karena kemampuannya dalam mengekstrak fitur spasial secara otomatis dari data piksel mentah.</bullet>

<h3>Implementasi Industri</h3>
<bullet>Digunakan pada kendaraan otonom untuk navigasi, sistem keamanan biometrik, diagnosis medis berbasis citra (X-ray, CT Scan), dan inspeksi otomatis pada lini produksi manufaktur.</bullet>

<h2>Sesi 7: Video Processing</h2>

<h3>Konsep Dasar Video</h3>
<bullet>Video adalah urutan gambar diam (frames) yang ditampilkan secara cepat untuk menciptakan ilusi gerakan. Parameter utamanya mencakup frame rate (jumlah gambar per detik) dan resolusi (jumlah piksel per gambar).</bullet>

<h3>Analisis Video Berbasis AI</h3>
<bullet>Berbeda dengan gambar diam, pengolahan video melibatkan dimensi temporal (waktu). AI digunakan untuk melacak pergerakan objek dari satu bingkai ke bingkai berikutnya.</bullet>

<h3>Teknik Pengolahan Video</h3>
<bullet><b>Deteksi Perubahan Adegan:</b> Mengidentifikasi perpindahan antar jepretan kamera secara otomatis.</bullet>
<bullet><b>Pelacakan Objek (Object Tracking):</b> Menjaga identitas objek yang sama di sepanjang durasi video meskipun terjadi perubahan posisi atau pencahayaan.</bullet>
<bullet><b>Pengenalan Aktivitas:</b> Memahami tindakan yang dilakukan dalam video, seperti orang berlari atau bersalaman.</bullet>

<h3>Kompresi Video</h3>
<bullet>Penggunaan algoritma cerdas untuk mengurangi ukuran data video tanpa penurunan kualitas yang signifikan agar mudah ditransmisikan melalui internet.</bullet>

<h3>Aplikasi Praktis</h3>
<bullet>Implementasi mencakup sistem pengawasan cerdas (smart surveillance) yang dapat mendeteksi perilaku mencurigakan, analisis performa atlet dalam olahraga, penyuntingan video otomatis, dan peningkatan kualitas video lama (video enhancement).</bullet>
`;
