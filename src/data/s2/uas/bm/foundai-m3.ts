export const foundaiModule3 = `
<h1>Modul 3: Ethics of AI</h1>
<subtitle>Modul terakhir ini fokus penuh pada sisi etika. Kalau modul sebelumnya menunjukkan betapa hebatnya AI di IoT, robotika, hiburan, kesehatan, dan keuangan, di sini pertanyaannya berbalik: apa risikonya kalau AI dipakai sembarangan, dan bagaimana membuatnya adil, aman, serta bisa dipertanggungjawabkan.</subtitle>
Outline dari slide: <b>Bias and fairness</b> serta <b>Privacy and security</b>. Pembahasannya tidak cuma soal bias dan privasi yang disebut di outline, tapi juga meluas ke keamanan, tanggung jawab, dan cara memasukkan etika ke seluruh proses pembuatan AI.

<h2>Understanding Bias and Fairness</h2>
<b>Bias</b> dalam AI artinya kesalahan yang berpola dan berulang atau ketidakadilan dalam cara dan hasil pengambilan keputusan, yang muncul dari sikap berat sebelah yang tidak disengaja di dalam data, rumus (algoritma), atau kebiasaan budaya. Bias seperti ini bisa berujung pada perlakuan yang membeda-bedakan, hasil yang berat sebelah, dan perlakuan yang tidak setara terhadap orang atau kelompok.
<h3>Types of Bias in AI</h3>
<bullet><b>Data Bias.</b> Bias yang lahir dari data latihan yang berat sebelah atau tidak mewakili semua kelompok. Contoh dari slide: kalau data persetujuan pinjaman di masa lalu cenderung menguntungkan kelompok tertentu, model AI yang dilatih dari data itu bisa ikut meneruskan praktik pinjaman yang tidak adil.</bullet>
<bullet><b>Algorithmic Bias.</b> Bias yang muncul saat desain, penulisan kode, atau penyetelan rumus AI memasukkan ketidakadilan. Contoh dari slide: sistem facial recognition punya tingkat kesalahan lebih tinggi pada orang berkulit gelap karena kelompok ini kurang terwakili di data latihan.</bullet>
<bullet><b>Cultural Bias.</b> Bias yang mencerminkan kebiasaan masyarakat, stereotype, atau latar budaya yang tertanam di sistem AI. Contoh dari slide: rumus sentiment analysis yang dilatih dengan data berbahasa Inggris bisa salah mengartikan ungkapan atau perasaan dalam bahasa dan budaya lain.</bullet>
<h3>Impact of Bias with Examples</h3>
<bullet><b>Recidivism Prediction Algorithms.</b> Rumus AI yang menebak kemungkinan seseorang mengulangi kejahatan di sistem peradilan dikritik karena berat sebelah pada ras tertentu. Data yang bias, seperti tingkat penangkapan yang dipengaruhi ketidakadilan ras yang sudah lama mengakar, bisa membuat rumus menebak lebih tinggi secara tidak adil untuk kelompok minoritas.</bullet>
<bullet><b>Employment and Hiring Practices.</b> Platform rekrutmen ber-AI bisa tanpa sengaja meneruskan bias gender kalau dilatih dengan data masa lalu yang timpang antar gender, sehingga memperkuat stereotype gender dan mempersempit peluang kelompok yang kurang terwakili.</bullet>
<bullet><b>Financial Services and Credit Scoring.</b> Model credit scoring ber-AI bisa berat sebelah kalau dilatih dengan data pinjaman masa lalu yang tidak adil, sehingga secara tidak adil menolak pinjaman atau memberi syarat yang merugikan bagi pelamar dari kelompok minoritas.</bullet>

<h2>Ensuring Fairness in AI</h2>
<h3>Fairness Metrics and Evaluation</h3>
<b>Fairness metrics</b> adalah ukuran berupa angka untuk menilai seberapa adil hasil rumus AI di antara kelompok orang yang berbeda. Yang umum dipakai:
<bullet><b>Statistical Parity.</b> Membandingkan seberapa banyak hasil yang menguntungkan (misalnya pinjaman disetujui) antar kelompok, supaya jumlahnya seimbang.</bullet>
<bullet><b>Equalized Odds.</b> Mengukur apakah tebakan AI (misalnya tebakan gagal bayar) sama tepatnya di semua kelompok, tanpa terpengaruh hal sensitif seperti ras atau gender.</bullet>
<bullet><b>Disparate Impact.</b> Memeriksa apakah ada perbedaan besar pada hasil (misalnya tingkat diterima) antara kelompok yang dilindungi dan yang tidak, pada keadaan yang sama.</bullet>
<bullet><b>Demographic Parity.</b> Memastikan keputusan (misalnya rekrutmen atau pinjaman) tidak bergantung pada hal yang dilindungi seperti suku atau gender.</bullet>
<bullet><b>Counterfactual Fairness.</b> Menilai apakah tebakan AI akan berubah seandainya hal sensitif seseorang berbeda, supaya hasilnya tetap sama dan konsisten.</bullet>
<h3>Case Studies on Fairness Challenges</h3>
<bullet><b>Amazon's AI Recruiting Tool.</b> Amazon membuat alat rekrutmen AI yang ternyata lebih memilih kandidat pria dibanding pelamar perempuan, karena dilatih dengan lamaran masa lalu yang kebanyakan dari pria, sehingga sarannya berat sebelah dan meneruskan ketimpangan gender.</bullet>
<bullet><b>ProPublica's Analysis of COMPAS Algorithm.</b> ProPublica menyelidiki rumus COMPAS yang dipakai di sistem peradilan AS untuk menebak kemungkinan mengulangi kejahatan. Hasilnya menunjukkan keberpihakan pada ras: terdakwa African-American lebih sering salah dicap "berisiko tinggi" dibanding terdakwa Caucasian dengan latar belakang serupa.</bullet>
<bullet><b>Google's Image Recognition Bias.</b> AI pengenalan gambar milik Google menunjukkan keberpihakan saat mengelompokkan foto orang berdasarkan stereotype ras dan gender, bahkan memberi label yang merendahkan pada foto orang kulit berwarna dan perempuan.</bullet>

<h2>Privacy Considerations in AI</h2>
<h3>Overview of Privacy Concerns</h3>
Kekhawatiran soal privasi muncul dari cara data pribadi dikumpulkan, disimpan, dipakai, dan dibagikan pada teknologi yang berbasis AI dan data. Masalah utamanya:
<bullet><b>Data Collection and Consent.</b> Bagaimana data pribadi dikumpulkan, apakah pengguna diberi tahu dengan cukup, dan apakah persetujuannya diminta secara terbuka dan sukarela.</bullet>
<bullet><b>Data Breaches and Security.</b> Risiko kebocoran data, akses oleh pihak tak berhak, dan serangan siber yang mengancam kerahasiaan dan keutuhan informasi pribadi.</bullet>
<bullet><b>Data Minimization.</b> Prinsip hanya mengambil data yang benar-benar perlu untuk tujuan tertentu dan tidak menyimpannya terlalu lama.</bullet>
<bullet><b>Algorithmic Transparency.</b> Kekhawatiran soal kurang terbukanya cara rumus AI mengambil keputusan, terutama pada sistem keputusan otomatis yang memengaruhi hak orang.</bullet>
<bullet><b>Re-identification Risks.</b> Risiko mengenali lagi siapa pemilik data yang sudah disamarkan, lalu mengaitkannya kembali ke orang aslinya.</bullet>
<h3>Data Protection Laws and Regulations</h3>
<bullet><b>General Data Protection Regulation (GDPR).</b> Berlaku di Uni Eropa, mengatur cara mengolah data pribadi secara sah, termasuk persetujuan, keterbukaan, data minimization, dan hak orang untuk melihat, memperbaiki, serta menghapus data pribadinya.</bullet>
<bullet><b>California Consumer Privacy Act (CCPA).</b> Berlaku di California, memberi warga hak atas data pribadinya, termasuk hak tahu data apa yang dikumpulkan atau dijual, dan hak menolak penjualan data pribadinya.</bullet>
<bullet><b>Health Insurance Portability and Accountability Act (HIPAA).</b> Di AS, mengatur pemakaian dan pembukaan protected health information (PHI) oleh penyedia layanan kesehatan, supaya rekam medis pasien terlindungi.</bullet>
<bullet><b>Personal Data Protection Bill (PDPB).</b> Diusulkan di India, bertujuan mengatur pengolahan data pribadi dengan menetapkan aturan soal persetujuan, penyimpanan data di dalam negeri (data localization), dan hak orang atas informasi pribadinya.</bullet>
<bullet><b>Privacy Shield.</b> Memudahkan perpindahan data pribadi antara EU dan AS, sambil memastikan perusahaan tetap mematuhi aturan GDPR saat memindahkan data ke luar EU.</bullet>
<h3>Privacy-Preserving Techniques</h3>
<bullet><b>Encryption.</b> Mengunci data sensitif dengan sandi supaya hanya pihak berwenang yang bisa membuka dan membacanya.</bullet>
<bullet><b>Anonymization and Pseudonymization.</b> Cara menghapus atau menyamarkan personally identifiable information (PII) supaya identitasnya tidak terlacak tapi datanya tetap berguna untuk dianalisis.</bullet>
<bullet><b>Differential Privacy.</b> Cara memastikan ada atau tidaknya data satu orang dalam kumpulan data tidak banyak mengubah hasil analisis, sehingga privasi tiap orang tetap terjaga.</bullet>
<bullet><b>Secure Multi-Party Computation (MPC).</b> Cara yang membuat beberapa pihak bisa sama-sama menghitung sesuatu dari data mereka tanpa harus saling membuka data masing-masing.</bullet>
<bullet><b>Privacy-Enhancing Technologies (PETs).</b> Kumpulan teknologi dan alat untuk melindungi privasi, termasuk peramban yang menjaga privasi, VPNs (Virtual Private Networks), dan sistem identitas yang tidak terpusat.</bullet>
<b>Contoh tambahan (di luar PPT):</b> Apple memakai Differential Privacy saat mengumpulkan data pemakaian iPhone. Dengan menambahkan "gangguan" angka secukupnya, Apple bisa melihat pola umum pengguna (misalnya emoji yang sedang tren) tanpa bisa melacaknya balik ke satu orang tertentu.

<h2>Security Challenges in AI</h2>
<h3>Adversarial Attacks in AI</h3>
<b>Adversarial attacks</b> adalah usaha sengaja untuk mengecoh sistem AI dengan memasukkan data yang dibuat khusus, yang sering tidak terlihat oleh manusia tapi memanfaatkan celah pada rumus AI. Serangan ini bisa merusak keandalan dan keamanan sistem AI sehingga tebakan atau perilakunya jadi keliru. Jenis utamanya:
<bullet><b>Input Perturbation Attacks.</b> Mengubah data masukan seperti gambar atau teks dengan perubahan kecil yang dibuat khusus, tidak terlihat manusia tapi bisa membuat model AI salah mengelompokkan.</bullet>
<bullet><b>Model Evasion Attacks.</b> Membuat masukan yang memaksa model AI salah menebak, biasanya dengan memanfaatkan kelemahan pada batas keputusannya.</bullet>
<bullet><b>Poisoning Attacks.</b> Mengotori data latihan atau menyelipkan contoh jahat saat model dilatih, supaya kemampuan model rusak atau menyisipkan keberpihakan.</bullet>
<bullet><b>Exploratory Attacks.</b> Mengulik sistem AI untuk menemukan celah, memahami cara ia mengambil keputusan, atau mencuri informasi sensitif.</bullet>
<h3>Robustness and Resilience</h3>
<bullet><b>Robustness.</b> Kemampuan sistem AI tetap bekerja dan tetap tepat saat menghadapi masukan tak terduga, perubahan kecil, atau serangan. Model yang robust lebih susah dikecoh dan tetap bisa bekerja baik di berbagai keadaan.</bullet>
<bullet><b>Resilience.</b> Kemampuan sistem AI untuk pulih dan menyesuaikan diri setelah diserang atau terganggu, sambil tetap berfungsi. Sistem yang resilient punya cara untuk mendeteksi, menahan, dan pulih dari ancaman.</bullet>
<h3>Case Study: Security Breaches in AI Applications</h3>
<bullet><b>Microsoft's Chatbot Tay.</b> Pada 2016, Microsoft meluncurkan chatbot bernama Tay di Twitter untuk mengobrol dengan pengguna dan belajar dari percakapan. Tapi dalam beberapa jam, Tay dikecoh pengguna jahat yang memanfaatkan cara belajarnya, sehingga ia mengeluarkan tanggapan kasar dan tidak pantas. Kejadian ini menunjukkan celah pada sistem NLP berbasis AI.</bullet>
<bullet><b>Tesla Autopilot System.</b> Sistem Autopilot Tesla yang memakai AI dan machine learning pernah disorot saat ada serangan, misalnya menempelkan stiker pada rambu jalan untuk mengecoh kemampuan AI mengenali objek. Serangan ini menegaskan pentingnya robustness dan resilience pada AI, apalagi di bidang yang menyangkut keselamatan.</bullet>

<h2>Accountability and Transparency</h2>
<h3>Importance of Accountability in AI</h3>
<b>Accountability</b> (tanggung jawab) dalam AI artinya tanggung jawab orang, perusahaan, dan sistem atas keputusan, tindakan, dan hasil yang dibuat teknologi AI. Alasan kenapa ini penting:
<bullet><b>Ethical and Legal Responsibility.</b> Sistem AI berdampak besar pada masyarakat di bidang seperti healthcare, finance, dan peradilan, jadi harus jelas siapa yang bertanggung jawab atas akibatnya.</bullet>
<bullet><b>Trust and Transparency.</b> Menumbuhkan rasa percaya pengguna dan pihak terkait dengan memastikan sistem AI bekerja andal dan sesuai etika.</bullet>
<bullet><b>Risk Management.</b> Menekan risiko dari kegagalan, kesalahan, bias, dan akibat tak terduga dengan menetapkan garis tanggung jawab yang jelas.</bullet>
<bullet><b>Compliance and Regulation.</b> Membantu mematuhi aturan hukum soal perlindungan data, privasi, dan hak konsumen.</bullet>
<bullet><b>Continuous Improvement.</b> Mendorong perbaikan terus-menerus lewat masukan, pemantauan, dan tanggung jawab yang membuat sistem belajar dari kesalahan.</bullet>
<h3>Explainability and Transparency in AI Systems</h3>
<bullet><b>Explainability.</b> Kemampuan sistem AI menjelaskan keputusan, tebakan, dan sarannya dengan cara yang bisa dimengerti manusia. Explainable AI (XAI) bertujuan membuka cara kerja model AI yang seperti "kotak hitam" supaya lebih dipercaya dan dipahami.</bullet>
<bullet><b>Transparency.</b> Keterbukaan soal cara sistem AI dibuat, dijalankan, memakai data, dan mengambil keputusan, supaya pengguna paham cara kerjanya dan data apa yang dipakai.</bullet>
<bullet><b>Interpretable Models.</b> Memilih model yang mudah dipahami seperti decision trees atau linear regression dibanding model deep learning yang rumit, supaya cara mengambil keputusannya lebih gampang dijelaskan.</bullet>
<bullet><b>Bias Detection and Mitigation.</b> Keterbukaan memudahkan menemukan dan mengurangi keberpihakan, karena pihak terkait bisa memeriksa rumusnya, menemukan pola yang tidak adil, dan memperbaikinya.</bullet>
<h3>Regulatory Frameworks and Guidelines</h3>
<bullet><b>General Data Protection Regulation (GDPR).</b> Berlaku di EU, menetapkan aturan mengolah data pribadi secara sah, termasuk keterbukaan, tanggung jawab, dan hak orang untuk melihat serta mengatur data pribadinya.</bullet>
<bullet><b>Ethical Guidelines for Trustworthy AI by the European Commission.</b> Menetapkan prinsip dan syarat untuk AI yang bisa dipercaya, dengan menekankan keterbukaan, tanggung jawab, dan penghormatan pada hak dasar manusia.</bullet>
<bullet><b>Algorithmic Accountability Act (USA).</b> Usulan undang-undang yang mewajibkan perusahaan memeriksa dan memperbaiki rumus yang tidak adil, membuat keputusan otomatis lebih terbuka, dan memastikan keadilan.</bullet>
<bullet><b>AI Ethics Guidelines by OECD and UNESCO.</b> Memberi prinsip dan saran untuk pembuatan serta pemakaian AI yang bertanggung jawab, dengan menekankan hak asasi manusia, keadilan, keterbukaan, dan tanggung jawab.</bullet>
<bullet><b>Sector-specific Regulations.</b> Aturan khusus yang menjawab tantangan dan risiko unik AI di bidang seperti healthcare, finance, kendaraan tanpa pengemudi, dan cybersecurity.</bullet>

<h2>Ethical Decision-Making in AI Development</h2>
Bagian ini menjelaskan cara memasukkan pertimbangan etika ke seluruh AI Lifecycle, yaitu proses pembuatan AI dari awal sampai akhir.
<bullet><b>Design Phase.</b> Menanamkan prinsip etika sejak awal dengan memikirkan dampaknya pada orang, kelompok, dan masyarakat. Termasuk menetapkan pedoman etika, menilai risiko, dan melibatkan banyak pihak yang beragam dalam proses perancangan.</bullet>
<bullet><b>Data Collection and Preparation.</b> Memastikan data latihan beragam, mewakili banyak kelompok, dan bebas dari keberpihakan. Menerapkan tata kelola data untuk melindungi privasi, meminta persetujuan, dan menyamarkan data sensitif.</bullet>
<bullet><b>Model Development and Training.</b> Memakai fairness metrics, teknik explainability, dan cara mendeteksi bias supaya model AI memberi hasil yang tepat, andal, dan setara untuk semua pengguna.</bullet>
<bullet><b>Deployment and Operation.</b> Menerapkan keterbukaan untuk menjelaskan cara dan hasil keputusan AI, memberi alasan atas keputusan yang memengaruhi orang, serta memantau kinerjanya dan cepat menangani jika ada yang aneh.</bullet>
<bullet><b>Evaluation and Iteration.</b> Terus menilai sisi etika sistem AI, meminta masukan dari pihak terkait, dan memperbaiki rumus serta caranya secara bertahap sesuai pertimbangan etika dan nilai masyarakat yang berkembang.</bullet>

<h2>Diskusi (Session 12)</h2>
Dua pertanyaan dari slide:
<bullet>Dalam hal privacy dan security, pertimbangan etika apa yang harus diutamakan pembuat AI dan pembuat kebijakan untuk melindungi data orang dan mencegah ancaman seperti adversarial attacks? Bagaimana menjaga keseimbangan antara kemajuan dan tanggung jawab etika dalam pembuatan AI?</bullet>
<bullet>Accountability dan transparency adalah pilar penting tata kelola AI yang etis. Bagaimana perusahaan dan badan pembuat aturan bisa membuat cara untuk meminta pertanggungjawaban pembuat dan pengguna AI atas keputusan serta hasil sistemnya? Peran apa yang harus dimainkan keterbukaan dan explainability dalam menumbuhkan rasa percaya dan tanggung jawab?</bullet>
`;
