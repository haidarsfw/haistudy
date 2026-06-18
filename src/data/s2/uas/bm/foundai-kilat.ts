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
    { n: 1, title: "AI di Sekitar Kita", subtitle: "AI ketemu IoT, mobil swakemudi, smart city, dan robot." },
    { n: 2, title: "Hiburan, Game & Masyarakat", subtitle: "Dari rekomendasi Netflix sampai AI di kesehatan & keuangan." },
    { n: 3, title: "Etika AI", subtitle: "Bias, privasi, keamanan, dan tanggung jawab." },
  ],
  cards: [
    // ============ BAB 1: AI di Sekitar Kita ============
    { kind: "intro", id: "f1-intro", chapter: 1, title: "AI di Sekitar Kita", subtitle: "AI bukan cuma di film. Dia udah nyempil di HP, rumah, kota, dan kendaraan kamu." },
    {
      kind: "explain", id: "f1-aiot", chapter: 1, icon: "Wifi",
      heading: "AIoT: AI ketemu IoT",
      body: "IoT itu benda-benda yang nyambung ke internet dan ngumpulin data. Pas digabung AI jadi AIoT: alirannya dari device (sensor) -> connectivity (jaringan) -> cloud (diproses AI) -> user (kamu lihat hasilnya).",
    },
    {
      kind: "categorize", id: "f1-layers", chapter: 1,
      prompt: "Tiap bagian ini masuk lapisan AIoT yang mana?",
      buckets: ["Device", "Connectivity", "Cloud", "User"],
      items: [
        { text: "Sensor suhu di ruangan", bucket: 0 },
        { text: "Jaringan WiFi/seluler yang nyambungin", bucket: 1 },
        { text: "AI yang ngolah data di server", bucket: 2 },
        { text: "Aplikasi di HP yang nampilin hasilnya", bucket: 3 },
      ],
      explain: "Device ngumpulin data, connectivity ngirim, cloud + AI ngolah, user lihat & ngatur lewat aplikasi.",
    },
    {
      kind: "explain", id: "f1-car", chapter: 1, icon: "Cpu",
      heading: "Mobil swakemudi: sense, think, act",
      body: "Polanya: sensors (kamera, radar) ngerasain sekitar -> controller (otak AI) mutusin -> actuators (rem, setir) gerak. Sama kayak AUDI smart factory yang sensornya ngatur mesin otomatis.",
    },
    {
      kind: "swipe", id: "f1-swipe", chapter: 1, prompt: "Pakai AI atau enggak?",
      statements: [
        { text: "Mobil yang ngerem sendiri pas deteksi pejalan kaki.", isTrue: true, note: "Iya, pakai AI buat ngenalin objek dan mutusin." },
        { text: "Lampu yang nyala kalau saklarnya ditekan manual.", isTrue: false, note: "Itu cuma listrik biasa, gak ada AI." },
        { text: "Robot NAO yang bisa gerak, ngerasain, ngobrol, dan 'mikir'.", isTrue: true },
        { text: "Kalkulator yang ngitung 2+2.", isTrue: false, note: "Itu logika tetap, bukan AI yang belajar dari data." },
      ],
    },
    {
      kind: "prompt", id: "f1-prompt", chapter: 1, tag: "Pakai AI sehari-hari",
      goal: "Kamu mau minta asisten AI bantu rangkum bab ini. Prompt mana yang bakal ngasih hasil paling oke?",
      options: [
        { text: "rangkum dong", better: false },
        { text: "Tolong rangkum bab ini jadi 3 poin utama, bahasa sederhana buat mahasiswa, plus 1 contoh nyata.", better: true },
        { text: "ai tolong", better: false },
      ],
      explain: "Prompt yang bagus itu jelas: ada konteks, format yang diminta (3 poin), gaya bahasa, dan audiensnya. Makin jelas, makin pas hasilnya.",
    },
    {
      kind: "checkpoint", id: "f1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Inti Bab 1 soal AI di sekitar kita:",
      options: [
        "AIoT ngalir device -> connectivity -> cloud (AI) -> user; AI yang belajar dari data, bukan logika tetap",
        "Semua alat elektronik otomatis pasti pakai AI",
        "AI cuma ada di robot humanoid",
      ],
      answer: 0,
      explain: "Tepat. AI itu yang belajar dari data dan mutusin, bukan sekadar otomatis. AIoT nyatuin sensor, jaringan, cloud, dan user.",
    },

    // ============ BAB 2: Hiburan, Game & Masyarakat ============
    { kind: "intro", id: "f2-intro", chapter: 2, title: "Hiburan, Game & Masyarakat", subtitle: "AI yang nyetir rekomendasi tontonan, bikin dunia game, sampai bantu dokter." },
    {
      kind: "explain", id: "f2-rec", chapter: 2, icon: "Megaphone",
      heading: "Mesin rekomendasi",
      body: "Netflix, Spotify, dan YouTube pakai AI buat belajar dari kebiasaan kamu, lalu nyodorin konten yang kemungkinan kamu suka (personalized recommendation). Plus content tagging dan A/B testing buat ngepasin.",
    },
    {
      kind: "categorize", id: "f2-domain", chapter: 2,
      prompt: "AI ini dipakai di bidang apa?",
      buckets: ["Hiburan", "Kesehatan", "Keuangan"],
      items: [
        { text: "Rekomendasi film & playlist", bucket: 0 },
        { text: "Deteksi penyakit dari citra medis", bucket: 1 },
        { text: "Deteksi transaksi penipuan (fraud)", bucket: 2 },
        { text: "NPC musuh yang nyesuain kesulitan game", bucket: 0 },
        { text: "Credit scoring buat pinjaman", bucket: 2 },
      ],
      explain: "AI udah nyebar: hiburan (rekomendasi, game), kesehatan (diagnosa), keuangan (fraud, credit scoring).",
    },
    {
      kind: "explain", id: "f2-game", chapter: 2, icon: "Bot",
      heading: "AI di game",
      body: "Procedural Content Generation (PCG) bikin level/dunia game otomatis. NPC AI bikin karakter non-pemain kelihatan 'hidup' dan nyesuain perilaku ke cara kamu main.",
    },
    {
      kind: "check", id: "f2-alphago", chapter: 2,
      question: "AlphaGo yang ngalahin juara dunia Go itu...",
      options: [
        "Sistem AI yang belajar dari jutaan pertandingan",
        "Tim grandmaster manusia yang main bareng",
        "Sekadar program acak",
      ],
      answer: 0,
      explain: "AlphaGo itu AI yang belajar lewat training dari banyak data pertandingan, sampai bisa ngalahin juara dunia. Bukti AI bisa nguasain tugas super kompleks.",
    },
    {
      kind: "scenario", id: "f2-bubble", chapter: 2, tag: "AI & Masyarakat",
      situation: "Algoritma rekomendasi terus-terusan nyodorin konten yang mirip sama yang udah kamu suka. Lama-lama kamu cuma lihat satu sudut pandang aja. Risiko etisnya?",
      choices: [
        { text: "Filter bubble / echo chamber: wawasan jadi sempit", correct: true, feedback: "Pas. Rekomendasi yang kelewat 'nyaman' bisa ngurung kamu di satu sudut pandang dan ngurangin info yang beragam." },
        { text: "Gak ada masalah sama sekali", correct: false, feedback: "Ada. Terlalu personal bisa bikin filter bubble yang nyempitin wawasan." },
        { text: "Cuma bikin aplikasi jadi berat", correct: false, feedback: "Bukan soal performa, tapi soal wawasan yang menyempit." },
      ],
    },
    {
      kind: "swipe", id: "f2-swipe", chapter: 2, prompt: "Bener atau salah?",
      statements: [
        { text: "AI di kesehatan bisa bantu baca citra medis buat deteksi dini.", isTrue: true },
        { text: "Mesin rekomendasi gak butuh data kebiasaan pengguna.", isTrue: false, note: "Justru belajar dari data kebiasaan kamu." },
        { text: "PCG dipakai buat bikin konten/level game otomatis.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "f2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Benang merah Bab 2:",
      options: [
        "AI nyebar di hiburan, game, kesehatan, dan keuangan, tapi rekomendasi yang kelewat personal bisa bikin filter bubble",
        "AI cuma berguna buat game",
        "Rekomendasi AI selalu netral dan tanpa risiko",
      ],
      answer: 0,
      explain: "Tepat. Manfaatnya gede di banyak bidang, tapi tetap ada efek samping kayak filter bubble yang perlu disadari.",
    },

    // ============ BAB 3: Etika AI ============
    { kind: "intro", id: "f3-intro", chapter: 3, title: "Etika AI", subtitle: "Kalau AI dipakai sembarangan, apa risikonya? Dan gimana bikin yang adil, aman, dan bertanggung jawab." },
    {
      kind: "explain", id: "f3-bias", chapter: 3, icon: "Scale",
      heading: "Bias: ketidakadilan yang berpola",
      body: "Bias AI itu hasil yang berat sebelah karena data, rumus, atau budaya yang timpang. Bisa bikin perlakuan gak adil ke kelompok tertentu, padahal AI-nya keliatan 'objektif'.",
    },
    {
      kind: "categorize", id: "f3-bias-type", chapter: 3,
      prompt: "Ini jenis bias yang mana?",
      buckets: ["Data Bias", "Algorithmic Bias", "Cultural Bias"],
      items: [
        { text: "Model dilatih dari data pinjaman lama yang berat sebelah", bucket: 0 },
        { text: "Desain/kode rumus yang masukin ketidakadilan (mis. facial recognition)", bucket: 1 },
        { text: "Sentiment analysis bahasa Inggris salah ngartiin budaya lain", bucket: 2 },
      ],
      explain: "Data bias = dari data latihan timpang. Algorithmic = dari desain/kode rumus. Cultural = dari kebiasaan/budaya yang kebawa.",
    },
    {
      kind: "scenario", id: "f3-amazon", chapter: 3, tag: "Kasus nyata",
      situation: "Alat rekrutmen AI Amazon ternyata lebih milih pelamar pria daripada perempuan. Kenapa bisa gitu?",
      choices: [
        { text: "Dilatih dari lamaran masa lalu yang mayoritas pria, jadi biasnya kebawa", correct: true, feedback: "Tepat. AI niru pola di data latihan. Data masa lalu yang timpang gender bikin sarannya ikut berat sebelah." },
        { text: "AI-nya emang sengaja dibikin sexist", correct: false, feedback: "Bukan disengaja. Biasnya kebawa dari data historis yang timpang, bukan niat jahat." },
        { text: "Kebetulan aja", correct: false, feedback: "Bukan kebetulan. Ini pola dari data latihan yang bias." },
      ],
      follow: {
        situation: "Biar gak keulang, langkah paling tepat?",
        choices: [
          { text: "Pakai data yang lebih beragam + cek pakai fairness metrics", correct: true, feedback: "Betul. Data representatif + audit keadilan ngurangin bias dari akarnya." },
          { text: "Sembunyiin cara kerja AI biar gak dikritik", correct: false, feedback: "Kebalikannya. Transparansi malah bantu nemuin dan benerin bias." },
        ],
      },
    },
    {
      kind: "explain", id: "f3-privacy", chapter: 3, icon: "Lock",
      heading: "Privasi & data",
      body: "AI haus data, jadi privasi krusial: gimana data dikumpulin (consent), seperlunya aja (data minimization), dan dilindungi. Aturan kayak GDPR, CCPA, dan HIPAA ngatur ini.",
    },
    {
      kind: "scenario", id: "f3-tesla", chapter: 3, tag: "Keamanan AI",
      situation: "Orang nempelin stiker kecil di rambu jalan, dan itu bikin Autopilot Tesla salah baca rambunya. Ini contoh apa?",
      choices: [
        { text: "Adversarial attack: input dibuat khusus buat ngecoh AI", correct: true, feedback: "Pas. Perubahan kecil yang gak keliatan manusia bisa ngecoh model AI. Makanya AI butuh robustness." },
        { text: "Bug software biasa", correct: false, feedback: "Bukan bug acak, tapi serangan yang sengaja manfaatin celah model AI." },
        { text: "Fitur yang disengaja", correct: false, feedback: "Jelas bukan fitur. Ini serangan yang bahaya, apalagi di urusan keselamatan." },
      ],
    },
    {
      kind: "multi", id: "f3-fair", chapter: 3,
      question: "Gimana cara bikin AI lebih adil, aman, dan bisa dipercaya? Pilih semua yang benar.",
      options: [
        "Pakai data latihan yang beragam & mewakili banyak kelompok",
        "Pakai fairness metrics + deteksi bias",
        "Sembunyiin cara kerja model dari semua pihak",
        "Terapkan accountability & explainability (bisa dijelasin)",
      ],
      answers: [0, 1, 3],
      explain: "Data beragam, audit keadilan, dan keterbukaan itu kuncinya. Nyembunyiin cara kerja (kebalikan transparansi) malah bikin bias susah ketahuan.",
    },
    {
      kind: "swipe", id: "f3-swipe", chapter: 3, prompt: "Bener atau salah?",
      statements: [
        { text: "Differential privacy nambahin sedikit 'gangguan' biar pola umum kelihatan tanpa ngelacak satu orang.", isTrue: true },
        { text: "Transparency artinya nyembunyiin cara AI ngambil keputusan.", isTrue: false, note: "Kebalikannya: transparency itu keterbukaan soal cara kerjanya." },
        { text: "Accountability mastiin jelas siapa yang tanggung jawab atas keputusan AI.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "f3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Benang merah etika AI:",
      options: [
        "AI bisa bias dari data/rumus/budaya; obatnya data beragam, fairness metrics, privasi, keamanan, dan transparansi",
        "AI selalu objektif jadi gak perlu diawasi",
        "Sembunyiin cara kerja AI itu bikin lebih etis",
      ],
      answer: 0,
      explain: "Tepat. AI niru pola di datanya, jadi bisa ikut bias. Keadilan, privasi, keamanan, dan keterbukaan itu yang bikin AI bisa dipercaya.",
    },
  ],
};
