import type { SubjectKilat } from "@/types";

// Belajar Kilat feed for Foundations of AI (s2-uas-bm).
// Source: rangkuman foundai-m1..m3 (AI+IoT/robots, entertainment/society, ethics of AI).
// Minigame dipilih yang nyambung materi: scenario etika, categorize, "AI atau bukan",
// swipe. 1 kartu prompt sebagai selingan "fun" (pakai asisten AI di kehidupan sehari-hari).
// Hotspot diagram sengaja dilewati dulu - butuh verifikasi koordinat di gambar aslinya.

export const foundaiKilat: SubjectKilat = {
  subjectId: "foundai",
  title: "Foundations of AI",
  chapters: [
    { n: 1, title: "AI di Sekitar Kita", subtitle: "Bagaimana AI bekerja bersama IoT, mobil swakemudi, smart city, dan robot." },
    { n: 2, title: "Hiburan, Game & Masyarakat", subtitle: "Mulai dari rekomendasi Netflix sampai AI di bidang kesehatan dan keuangan." },
    { n: 3, title: "Etika AI", subtitle: "Bias, privasi, keamanan, dan tanggung jawab." },
  ],
  cards: [
    // ============ BAB 1: AI di Sekitar Kita ============
    { kind: "intro", id: "f1-intro", chapter: 1, title: "AI di Sekitar Kita", subtitle: "AI bukan cuma ada di film. Sekarang AI sudah ada di HP, rumah, kota, sampai kendaraan yang kamu pakai sehari-hari." },
    {
      kind: "explain", id: "f1-aiot", chapter: 1, icon: "Wifi",
      heading: "AIoT: gabungan AI dan IoT",
      body: "IoT adalah benda-benda yang terhubung ke internet dan mengumpulkan data. Begitu digabung dengan AI, namanya menjadi AIoT. Alurnya seperti ini: device (sensor mengumpulkan data), lalu connectivity (jaringan mengirim data), lalu cloud (AI mengolahnya), lalu user (kamu melihat hasilnya).",
    },
    {
      kind: "categorize", id: "f1-layers", chapter: 1,
      prompt: "Setiap bagian ini masuk ke lapisan AIoT yang mana?",
      buckets: ["Device", "Connectivity", "Cloud", "User"],
      items: [
        { text: "Sensor suhu di ruangan", bucket: 0 },
        { text: "Jaringan WiFi atau seluler yang menghubungkan", bucket: 1 },
        { text: "AI yang mengolah data di server", bucket: 2 },
        { text: "Aplikasi di HP yang menampilkan hasilnya", bucket: 3 },
      ],
      explain: "Device mengumpulkan data, connectivity mengirimnya, cloud dan AI mengolahnya, lalu user melihat dan mengaturnya lewat aplikasi.",
    },
    {
      kind: "explain", id: "f1-car", chapter: 1, icon: "Cpu",
      heading: "Mobil swakemudi: sense, think, act",
      body: "Polanya ada tiga langkah: sensor (kamera, radar) merasakan keadaan sekitar, lalu controller (otak AI) mengambil keputusan, lalu actuator (rem, setir) bergerak. Konsepnya mirip dengan smart factory AUDI, yang sensornya mengatur mesin secara otomatis.",
    },
    {
      kind: "swipe", id: "f1-swipe", chapter: 1, prompt: "Pakai AI atau tidak?",
      statements: [
        { text: "Mobil yang mengerem sendiri saat mendeteksi pejalan kaki.", isTrue: true, note: "Benar, AI dipakai untuk mengenali objek dan mengambil keputusan." },
        { text: "Lampu yang menyala saat saklarnya ditekan manual.", isTrue: false, note: "Itu cuma rangkaian listrik biasa, tidak ada AI di dalamnya." },
        { text: "Robot NAO yang bisa bergerak, merasakan, mengobrol, dan seolah berpikir.", isTrue: true },
        { text: "Kalkulator yang menghitung 2 + 2.", isTrue: false, note: "Itu logika yang tetap, bukan AI yang belajar dari data." },
      ],
    },
    {
      kind: "prompt", id: "f1-prompt", chapter: 1, tag: "Pakai AI sehari-hari",
      goal: "Kamu mau minta asisten AI membantu merangkum bab ini. Prompt mana yang akan memberi hasil paling baik?",
      options: [
        { text: "rangkum dong", better: false },
        { text: "Tolong rangkum bab ini menjadi 3 poin utama, dengan bahasa sederhana untuk mahasiswa, lalu tambahkan 1 contoh nyata.", better: true },
        { text: "ai tolong", better: false },
      ],
      explain: "Prompt yang baik itu jelas: ada konteksnya, ada format yang diminta (3 poin), ada gaya bahasa, dan ada siapa pembacanya. Semakin jelas permintaanmu, semakin sesuai hasilnya.",
    },
    {
      kind: "checkpoint", id: "f1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Apa inti dari Bab 1 tentang AI di sekitar kita?",
      options: [
        "AIoT mengalir dari device ke connectivity ke cloud (AI) ke user, dan AI itu belajar dari data, bukan sekadar logika tetap",
        "Semua alat elektronik otomatis pasti memakai AI",
        "AI hanya ada di robot humanoid",
      ],
      answer: 0,
      explain: "Tepat. AI adalah sistem yang belajar dari data lalu mengambil keputusan, bukan sekadar alat otomatis. AIoT menyatukan sensor, jaringan, cloud, dan user dalam satu alur.",
    },

    // ============ BAB 2: Hiburan, Game & Masyarakat ============
    { kind: "intro", id: "f2-intro", chapter: 2, title: "Hiburan, Game & Masyarakat", subtitle: "AI yang mengatur rekomendasi tontonan, membangun dunia game, sampai membantu dokter." },
    {
      kind: "explain", id: "f2-rec", chapter: 2, icon: "Megaphone",
      heading: "Mesin rekomendasi",
      body: "Netflix, Spotify, dan YouTube memakai AI untuk belajar dari kebiasaanmu, lalu menampilkan konten yang kemungkinan besar kamu suka (personalized recommendation). Mereka juga memakai content tagging dan A/B testing untuk terus menyesuaikan rekomendasinya.",
    },
    {
      kind: "categorize", id: "f2-domain", chapter: 2,
      prompt: "AI ini dipakai di bidang apa?",
      buckets: ["Hiburan", "Kesehatan", "Keuangan"],
      items: [
        { text: "Rekomendasi film dan playlist", bucket: 0 },
        { text: "Deteksi penyakit dari citra medis", bucket: 1 },
        { text: "Deteksi transaksi penipuan (fraud)", bucket: 2 },
        { text: "NPC musuh yang menyesuaikan tingkat kesulitan game", bucket: 0 },
        { text: "Credit scoring untuk pinjaman", bucket: 2 },
      ],
      explain: "AI sudah dipakai di banyak bidang: hiburan (rekomendasi, game), kesehatan (diagnosa), dan keuangan (deteksi fraud, credit scoring).",
    },
    {
      kind: "explain", id: "f2-game", chapter: 2, icon: "Bot",
      heading: "AI di game",
      body: "Procedural Content Generation (PCG) membuat level atau dunia game secara otomatis. NPC berbasis AI membuat karakter non-pemain terlihat hidup dan menyesuaikan perilakunya dengan cara kamu bermain.",
    },
    {
      kind: "check", id: "f2-alphago", chapter: 2,
      question: "AlphaGo yang mengalahkan juara dunia Go itu sebenarnya...",
      options: [
        "Sistem AI yang belajar dari jutaan pertandingan",
        "Tim grandmaster manusia yang bermain bersama",
        "Sekadar program acak",
      ],
      answer: 0,
      explain: "AlphaGo adalah AI yang belajar melalui training dari banyak data pertandingan, sampai akhirnya bisa mengalahkan juara dunia. Ini bukti bahwa AI mampu menguasai tugas yang sangat kompleks.",
    },
    {
      kind: "scenario", id: "f2-bubble", chapter: 2, tag: "AI & Masyarakat",
      situation: "Algoritma rekomendasi terus-menerus menampilkan konten yang mirip dengan yang sudah kamu suka. Lama-lama kamu hanya melihat satu sudut pandang saja. Apa risiko etisnya?",
      choices: [
        { text: "Filter bubble atau echo chamber: wawasan jadi sempit", correct: true, feedback: "Tepat. Rekomendasi yang terlalu nyaman bisa mengurung kamu pada satu sudut pandang dan mengurangi informasi yang beragam." },
        { text: "Tidak ada masalah sama sekali", correct: false, feedback: "Sebenarnya ada. Rekomendasi yang terlalu personal bisa menciptakan filter bubble yang mempersempit wawasan." },
        { text: "Hanya membuat aplikasi jadi berat", correct: false, feedback: "Ini bukan soal performa aplikasi, tapi soal wawasan yang menyempit." },
      ],
    },
    {
      kind: "swipe", id: "f2-swipe", chapter: 2, prompt: "Benar atau salah?",
      statements: [
        { text: "AI di bidang kesehatan bisa membantu membaca citra medis untuk deteksi dini.", isTrue: true },
        { text: "Mesin rekomendasi tidak butuh data kebiasaan pengguna.", isTrue: false, note: "Justru sebaliknya, mesin ini belajar dari data kebiasaanmu." },
        { text: "PCG dipakai untuk membuat konten atau level game secara otomatis.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "f2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Apa benang merah dari Bab 2?",
      options: [
        "AI dipakai di hiburan, game, kesehatan, dan keuangan, tapi rekomendasi yang terlalu personal bisa menciptakan filter bubble",
        "AI hanya berguna untuk game",
        "Rekomendasi AI selalu netral dan tanpa risiko",
      ],
      answer: 0,
      explain: "Tepat. Manfaat AI besar di banyak bidang, tapi tetap ada efek samping seperti filter bubble yang perlu kita sadari.",
    },

    // ============ BAB 3: Etika AI ============
    { kind: "intro", id: "f3-intro", chapter: 3, title: "Etika AI", subtitle: "Kalau AI dipakai sembarangan, apa risikonya? Dan bagaimana cara membuat AI yang adil, aman, serta bertanggung jawab." },
    {
      kind: "explain", id: "f3-bias", chapter: 3, icon: "Scale",
      heading: "Bias: ketidakadilan yang berpola",
      body: "Bias AI adalah hasil yang berat sebelah karena data, rumus, atau budaya yang tidak seimbang. Akibatnya, kelompok tertentu bisa diperlakukan tidak adil, padahal AI-nya terlihat objektif.",
    },
    {
      kind: "categorize", id: "f3-bias-type", chapter: 3,
      prompt: "Ini termasuk jenis bias yang mana?",
      buckets: ["Data Bias", "Algorithmic Bias", "Cultural Bias"],
      items: [
        { text: "Model dilatih dari data pinjaman lama yang berat sebelah", bucket: 0 },
        { text: "Desain atau kode rumus yang memasukkan ketidakadilan (misalnya pada facial recognition)", bucket: 1 },
        { text: "Sentiment analysis berbahasa Inggris yang salah mengartikan budaya lain", bucket: 2 },
      ],
      explain: "Data bias berasal dari data latihan yang berat sebelah. Algorithmic bias berasal dari desain atau kode rumusnya. Cultural bias berasal dari kebiasaan atau budaya yang ikut terbawa.",
    },
    {
      kind: "scenario", id: "f3-amazon", chapter: 3, tag: "Kasus nyata",
      situation: "Alat rekrutmen AI milik Amazon ternyata lebih memilih pelamar pria daripada perempuan. Kenapa bisa begitu?",
      choices: [
        { text: "Dilatih dari lamaran masa lalu yang mayoritas pria, jadi biasnya ikut terbawa", correct: true, feedback: "Tepat. AI meniru pola di data latihannya. Data masa lalu yang timpang secara gender membuat sarannya ikut berat sebelah." },
        { text: "AI-nya memang sengaja dibuat sexist", correct: false, feedback: "Bukan karena disengaja. Biasnya terbawa dari data historis yang timpang, bukan karena niat jahat." },
        { text: "Hanya kebetulan saja", correct: false, feedback: "Ini bukan kebetulan. Ini pola yang muncul dari data latihan yang bias." },
      ],
      follow: {
        situation: "Supaya tidak terulang, langkah apa yang paling tepat?",
        choices: [
          { text: "Pakai data yang lebih beragam dan periksa dengan fairness metrics", correct: true, feedback: "Betul. Data yang representatif ditambah audit keadilan akan mengurangi bias dari akarnya." },
          { text: "Sembunyikan cara kerja AI supaya tidak dikritik", correct: false, feedback: "Justru sebaliknya. Transparansi malah membantu menemukan dan memperbaiki bias." },
        ],
      },
    },
    {
      kind: "explain", id: "f3-privacy", chapter: 3, icon: "Lock",
      heading: "Privasi dan data",
      body: "AI sangat bergantung pada data, jadi privasi menjadi hal yang penting: bagaimana data dikumpulkan (consent), diambil seperlunya saja (data minimization), dan dilindungi. Aturan seperti GDPR, CCPA, dan HIPAA dibuat untuk mengatur hal ini.",
    },
    {
      kind: "scenario", id: "f3-tesla", chapter: 3, tag: "Keamanan AI",
      situation: "Seseorang menempelkan stiker kecil di rambu jalan, dan itu membuat Autopilot Tesla salah membaca rambunya. Ini contoh dari apa?",
      choices: [
        { text: "Adversarial attack: input sengaja dibuat khusus untuk mengecoh AI", correct: true, feedback: "Tepat. Perubahan kecil yang nyaris tidak terlihat manusia bisa mengecoh model AI. Karena itu AI perlu robustness." },
        { text: "Bug software biasa", correct: false, feedback: "Ini bukan bug acak, tapi serangan yang sengaja memanfaatkan celah model AI." },
        { text: "Fitur yang memang disengaja", correct: false, feedback: "Jelas bukan fitur. Ini serangan yang berbahaya, apalagi dalam urusan keselamatan." },
      ],
    },
    {
      kind: "multi", id: "f3-fair", chapter: 3,
      question: "Bagaimana cara membuat AI lebih adil, aman, dan bisa dipercaya? Pilih semua yang benar.",
      options: [
        "Pakai data latihan yang beragam dan mewakili banyak kelompok",
        "Pakai fairness metrics dan deteksi bias",
        "Sembunyikan cara kerja model dari semua pihak",
        "Terapkan accountability dan explainability (keputusannya bisa dijelaskan)",
      ],
      answers: [0, 1, 3],
      explain: "Data yang beragam, audit keadilan, dan keterbukaan adalah kuncinya. Menyembunyikan cara kerja model (kebalikan dari transparansi) justru membuat bias makin sulit ketahuan.",
    },
    {
      kind: "swipe", id: "f3-swipe", chapter: 3, prompt: "Benar atau salah?",
      statements: [
        { text: "Differential privacy menambahkan sedikit gangguan supaya pola umum tetap terlihat tanpa melacak satu orang tertentu.", isTrue: true },
        { text: "Transparency berarti menyembunyikan cara AI mengambil keputusan.", isTrue: false, note: "Justru sebaliknya: transparency berarti keterbukaan soal cara kerjanya." },
        { text: "Accountability memastikan jelas siapa yang bertanggung jawab atas keputusan AI.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "f3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Apa benang merah dari etika AI?",
      options: [
        "AI bisa bias karena data, rumus, atau budaya, dan solusinya adalah data yang beragam, fairness metrics, privasi, keamanan, serta transparansi",
        "AI selalu objektif sehingga tidak perlu diawasi",
        "Menyembunyikan cara kerja AI membuatnya lebih etis",
      ],
      answer: 0,
      explain: "Tepat. AI meniru pola di datanya, jadi bisa ikut bias. Keadilan, privasi, keamanan, dan keterbukaan itulah yang membuat AI bisa dipercaya.",
    },
  ],
};
