import type { SubjectKilat } from "@/types";

// Belajar Kilat feed for Operations Management (s2-uas-bm).
// Source: rangkuman opsmgmt-m1..m6. Character: calculation-heavy. Signature
// minigame = calc (pick + type). Voice santai, 1 ide/kartu, tanpa em-dash.

export const opsmgmtKilat: SubjectKilat = {
  subjectId: "opsmgmt",
  title: "Operations Management",
  chapters: [
    { n: 1, title: "Strategi Lokasi", subtitle: "Memilih lokasi pabrik, dan kenapa upah murah belum tentu berarti biaya murah." },
    { n: 2, title: "Manajemen Persediaan", subtitle: "Berapa banyak yang dipesan (EOQ) dan kapan harus memesan lagi (ROP)." },
    { n: 3, title: "Perencanaan & Operasi", subtitle: "Aggregate planning, MRP, penjadwalan, sampai lean." },
  ],
  cards: [
    // ============ BAB 1: Strategi Lokasi ============
    { kind: "intro", id: "o1-intro", chapter: 1, title: "Strategi Lokasi", subtitle: "Lokasi adalah keputusan jangka panjang yang sulit ditarik kembali. Sekali salah, dampaknya terasa lama." },
    {
      kind: "explain", id: "o1-why", chapter: 1, icon: "MapPin",
      heading: "Lokasi sangat menentukan biaya",
      body: "Lokasi berpengaruh besar pada fixed cost (biaya tetap) dan variable cost (biaya yang ikut jumlah produksi). Karena lokasi jarang diubah, memilih lokasi yang tepat itu sebuah investasi, bukan buang-buang waktu.",
    },
    {
      kind: "explain", id: "o1-levels", chapter: 1, icon: "Layers",
      heading: "Memilih lokasi itu bertingkat",
      body: "Dimulai dari memilih negara, lalu wilayah, lalu site (lokasi persisnya). Setiap tingkat punya key success factor (KSF) sendiri.",
    },
    {
      kind: "categorize", id: "o1-ksf", chapter: 1,
      prompt: "Faktor ini biasanya dipikirkan di tingkat yang mana?",
      buckets: ["Negara", "Wilayah", "Site"],
      items: [
        { text: "Risiko politik dan nilai tukar", bucket: 0 },
        { text: "Biaya dan ketersediaan tenaga kerja daerah", bucket: 1 },
        { text: "Aturan zonasi (zoning)", bucket: 2 },
        { text: "Insentif pajak dan kedekatan dengan bahan baku", bucket: 1 },
      ],
      explain: "Tingkat negara membahas hal makro (politik, kurs). Tingkat wilayah membahas tenaga kerja, pajak, dan kedekatan bahan baku. Tingkat site membahas detail tempat seperti zonasi dan akses jalan.",
    },
    {
      kind: "explain", id: "o1-prod", chapter: 1, icon: "Gauge",
      heading: "Upah murah belum tentu biaya murah",
      body: "Yang penting bukan hanya upah, tapi juga produktivitas. Biaya tenaga kerja per unit = biaya tenaga kerja per hari dibagi jumlah unit per hari.",
    },
    {
      kind: "calc", id: "o1-calc-sc", chapter: 1, mode: "pick",
      tag: "Hitung", question: "South Carolina: upah USD 70 per hari, menghasilkan 60 unit per hari. Berapa biaya tenaga kerja per unit?",
      formula: "$\\dfrac{\\text{biaya per hari}}{\\text{unit per hari}}$",
      options: ["USD 1,17", "USD 0,86", "USD 70", "USD 4.200"],
      answer: 0,
      steps: ["70 ÷ 60 = 1,17 per unit."],
      explain: "USD 70 dibagi 60 unit menghasilkan USD 1,17 per unit.",
    },
    {
      kind: "calc", id: "o1-calc-mx", chapter: 1, mode: "type",
      tag: "Hitung", question: "Mexico: upah USD 25 per hari, tapi hanya 20 unit per hari. Berapa biaya tenaga kerja per unit? (tulis angkanya saja)",
      formula: "$\\dfrac{\\text{biaya per hari}}{\\text{unit per hari}}$", answer: "1.25", unit: "USD",
      steps: ["25 ÷ 20 = 1,25 per unit."],
      explain: "USD 25 dibagi 20 menghasilkan USD 1,25. Walaupun upahnya jauh lebih murah dari South Carolina, per unitnya malah lebih mahal karena produktivitasnya rendah.",
    },
    {
      kind: "scenario", id: "o1-scn", chapter: 1, tag: "Studi Kasus",
      situation: "Sebuah pabrik mau pindah. South Carolina: USD 1,17 per unit. Mexico: USD 1,25 per unit. Mana yang dipilih kalau hanya melihat biaya tenaga kerja per unit?",
      choices: [
        { text: "South Carolina", correct: true, feedback: "Betul. 1,17 < 1,25. Produktivitas yang tinggi membuat South Carolina lebih murah per unit, walaupun upahnya lebih besar." },
        { text: "Mexico, karena upahnya murah", correct: false, feedback: "Upah murah bisa jadi jebakan. Per unitnya justru lebih mahal karena produktivitasnya rendah." },
        { text: "Sama saja", correct: false, feedback: "Berbeda: 1,17 dibanding 1,25 per unit. South Carolina menang." },
      ],
    },
    {
      kind: "explain", id: "o1-cvl", chapter: 1, icon: "Calculator",
      heading: "Locational cost-volume analysis",
      body: "Kita membandingkan lokasi memakai Total Cost = Fixed Cost + (Variable Cost x Volume). Titik temu (crossover) antar lokasi menunjukkan lokasi mana yang termurah pada rentang volume tertentu.",
    },
    {
      kind: "calc", id: "o1-calc-cross", chapter: 1, mode: "pick",
      tag: "Hitung", question: "Athens: 30.000 + 75x. Brussels: 60.000 + 45x. Pada volume (x) berapa biayanya sama?",
      formula: "$30000 + 75x = 60000 + 45x$",
      options: ["1.000 unit", "2.500 unit", "750 unit", "30.000 unit"],
      answer: 0,
      steps: ["30.000 + 75x = 60.000 + 45x", "30x = 30.000", "x = 1.000 unit."],
      explain: "Selisih fixed cost 30.000 dibagi selisih variable cost 30 menghasilkan 1.000 unit. Di bawah 1.000 unit Athens termurah, di atasnya Brussels yang termurah.",
    },
    {
      kind: "swipe", id: "o1-swipe", chapter: 1, prompt: "Benar atau salah?",
      statements: [
        { text: "Center-of-gravity dipakai untuk mencari lokasi pusat distribusi yang biaya kirimnya paling kecil.", isTrue: true },
        { text: "Clustering berarti menjauhkan pabrik dari pesaing.", isTrue: false, note: "Clustering justru berkumpul dekat pesaing (contohnya Silicon Valley)." },
        { text: "Contoh intangible cost adalah kualitas hidup dan ketersediaan transportasi umum.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Apa pelajaran inti Bab 1 tentang lokasi dan biaya tenaga kerja?",
      options: [
        "Yang dilihat adalah biaya per unit (upah dibagi produktivitas), bukan hanya upahnya saja",
        "Selalu pilih lokasi dengan upah paling murah",
        "Lokasi tidak berpengaruh terhadap biaya",
      ],
      answer: 0,
      explain: "Tepat. Upah murah dengan produktivitas rendah justru bisa membuat biaya per unit lebih mahal. Jadi selalu hitung per unit.",
    },

    // ============ BAB 2: Manajemen Persediaan ============
    { kind: "intro", id: "o2-intro", chapter: 2, title: "Manajemen Persediaan", subtitle: "Cari keseimbangan: stok yang berlebih itu boros, tapi stok yang kurang membuat kehabisan." },
    {
      kind: "explain", id: "o2-goal", chapter: 2, icon: "Boxes",
      heading: "Inti persediaan adalah keseimbangan",
      body: "Tujuannya menyeimbangkan uang yang tertanam di stok dengan kualitas pelayanan ke pelanggan. Persediaan bisa mencapai 50% dari modal yang ditanam, jadi tidak bisa asal banyak.",
    },
    {
      kind: "categorize", id: "o2-types", chapter: 2,
      prompt: "Masukkan setiap barang ke jenis persediaannya:",
      buckets: ["Raw material", "WIP", "MRO", "Finished goods"],
      items: [
        { text: "Baja yang baru dibeli, belum diproses", bucket: 0 },
        { text: "Rangka setengah jadi di lini produksi", bucket: 1 },
        { text: "Oli pelumas untuk merawat mesin", bucket: 2 },
        { text: "Sepatu jadi yang tinggal dikirim", bucket: 3 },
      ],
      explain: "Raw material belum diproses, WIP sedang diproses, MRO dipakai untuk merawat mesin atau proses, dan Finished goods adalah produk jadi yang siap dikirim.",
    },
    {
      kind: "explain", id: "o2-abc", chapter: 2, icon: "ClipboardList",
      heading: "ABC analysis",
      body: "Stok dibagi berdasarkan annual dollar volume (unit x harga). Class A: jumlah barangnya sedikit (sekitar 20%) tapi mewakili sekitar 72% nilai. Class C: barangnya banyak tapi nilainya kecil. Fokuskan perhatian pada Class A.",
    },
    {
      kind: "table", id: "o2-abc-table", chapter: 2, mode: "fill",
      title: "Annual dollar volume",
      columns: ["Item", "Unit", "Harga", "Nilai/th"],
      rows: [["10286", 1000, "$90", 0]],
      blank: [0, 3],
      options: ["$90.000", "$1.090", "$900", "$90"],
      answer: 0,
      explain: "1.000 unit x USD 90 = USD 90.000. Nilai sebesar ini membuat item tersebut masuk Class A.",
    },
    {
      kind: "explain", id: "o2-eoq", chapter: 2, icon: "Calculator",
      heading: "EOQ: berapa banyak yang dipesan",
      body: "Economic Order Quantity mencari jumlah pesanan yang paling hemat, yaitu saat holding cost sama dengan setup cost. Rumusnya $Q^* = \\sqrt{2DS/H}$.",
    },
    {
      kind: "calc", id: "o2-eoq-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "D = 1.000, S = USD 10 per order, H = USD 0,50 per unit per tahun. Berapa EOQ (Q*)?",
      formula: "$Q^* = \\sqrt{\\dfrac{2DS}{H}}$",
      options: ["200 unit", "400 unit", "100 unit", "40.000 unit"],
      answer: 0,
      steps: ["2 x 1.000 x 10 / 0,50 = 40.000", "akar 40.000 = 200 unit."],
      explain: "Akar dari 40.000 sama dengan 200 unit. Itulah jumlah pesanan yang paling hemat.",
    },
    {
      kind: "calc", id: "o2-avg", chapter: 2, mode: "type",
      tag: "Hitung", question: "Kalau EOQ-nya 200 unit, berapa rata-rata stoknya (Q/2)? (tulis angkanya saja)",
      formula: "$\\text{rata-rata stok} = \\dfrac{Q}{2}$", answer: "100",
      steps: ["200 ÷ 2 = 100 unit."],
      explain: "Stok turun dari Q ke 0 secara berulang, jadi rata-ratanya adalah Q/2 = 100 unit.",
    },
    {
      kind: "explain", id: "o2-rop", chapter: 2, icon: "Clock",
      heading: "ROP: kapan harus memesan lagi",
      body: "Reorder Point menjawab pertanyaan 'kapan'. $ROP = d \\times L$, dengan d = permintaan per hari dan L = lead time (jumlah hari menunggu barang datang).",
    },
    {
      kind: "calc", id: "o2-rop-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "8.000 unit per tahun, 250 hari kerja, lead time 3 hari. Berapa ROP-nya?",
      formula: "$d = \\dfrac{D}{\\text{hari kerja}}, \\quad ROP = d \\times L$",
      options: ["96 unit", "128 unit", "32 unit", "24.000 unit"],
      answer: 0,
      steps: ["d = 8.000 / 250 = 32 per hari", "ROP = 32 x 3 = 96 unit."],
      explain: "Per hari 32 unit, dikalikan lead time 3 hari, hasilnya 96. Saat stok menyentuh 96, kita memesan lagi.",
    },
    {
      kind: "explain", id: "o2-ss", chapter: 2, icon: "Package",
      heading: "Safety stock untuk berjaga-jaga",
      body: "Kalau permintaan tidak pasti, kita tambahkan safety stock supaya tidak kehabisan. ROP = d x L + safety stock. Semakin tinggi service level yang diinginkan, semakin besar safety stock-nya.",
    },
    {
      kind: "swipe", id: "o2-swipe", chapter: 2, prompt: "Benar atau salah?",
      statements: [
        { text: "EOQ menjawab 'berapa banyak', sedangkan ROP menjawab 'kapan'.", isTrue: true },
        { text: "Quantity discount selalu menguntungkan karena harga per unit turun.", isTrue: false, note: "Holding cost ikut naik karena stoknya jadi banyak, jadi perlu dihitung secara total." },
        { text: "Class A sebaiknya dikontrol lebih ketat daripada Class C.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Apa dua angka kunci dalam manajemen persediaan?",
      options: [
        "EOQ $=\\sqrt{2DS/H}$ untuk 'berapa', dan ROP $= d \\times L$ untuk 'kapan'",
        "EOQ untuk 'kapan', dan ROP untuk 'berapa'",
        "Pesan sebanyak-banyaknya supaya tidak kehabisan",
      ],
      answer: 0,
      explain: "Tepat. EOQ adalah jumlah yang hemat, dan ROP adalah titik untuk memesan ulang. Stok yang berlebih justru boros holding cost.",
    },

    // ============ BAB 3: Perencanaan & Operasi ============
    { kind: "intro", id: "o3-intro", chapter: 3, title: "Perencanaan & Operasi", subtitle: "Mulai dari rencana kapasitas, kebutuhan bahan, penjadwalan, sampai lean." },
    {
      kind: "explain", id: "o3-agg", chapter: 3, icon: "ClipboardList",
      heading: "Aggregate planning & S&OP",
      body: "Aggregate planning menyusun rencana produksi jangka menengah (biasanya 3 sampai 18 bulan) supaya sesuai dengan permintaan dengan biaya yang kecil. S&OP menyatukan rencana penjualan dan operasi agar keduanya sejalan.",
    },
    {
      kind: "categorize", id: "o3-options", chapter: 3,
      prompt: "Ini termasuk mengatur kapasitas atau mengatur permintaan?",
      buckets: ["Pilihan Kapasitas", "Pilihan Permintaan"],
      items: [
        { text: "Lembur (overtime) atau menambah shift", bucket: 0 },
        { text: "Memengaruhi permintaan lewat promo dan harga", bucket: 1 },
        { text: "Merekrut atau memberhentikan pekerja", bucket: 0 },
        { text: "Backorder saat sedang sibuk", bucket: 1 },
        { text: "Subkontrak ke pihak lain", bucket: 0 },
      ],
      explain: "Pilihan kapasitas mengatur sisi produksi (lembur, rekrut, subkontrak). Pilihan permintaan menggeser atau mengatur permintaan (promo, backorder).",
    },
    {
      kind: "explain", id: "o3-strategy", chapter: 3, icon: "Gauge",
      heading: "Chase vs Level",
      body: "Ada dua strategi aggregate planning. Chase: produksi mengikuti permintaan tiap periode (diatur lewat rekrut, memberhentikan, atau lembur). Level: produksi dijaga stabil, dan naik turunnya permintaan diserap oleh inventory atau backorder.",
    },
    {
      kind: "check", id: "o3-level", chapter: 3,
      question: "Strategi 'level' dalam aggregate planning artinya...",
      options: [
        "Produksi dijaga stabil, dan fluktuasi permintaan diserap oleh stok atau backorder",
        "Produksi mengikuti permintaan secara persis tiap periode",
        "Berhenti produksi saat permintaan turun",
      ],
      answer: 0,
      explain: "Level berarti laju produksi dibuat rata (nyaman untuk tenaga kerja dan mesin), dan selisihnya ditampung oleh inventory atau backorder. Yang mengikuti permintaan adalah strategi chase.",
    },
    {
      kind: "explain", id: "o3-mrp", chapter: 3, icon: "Factory",
      heading: "MRP: kebutuhan bahan",
      body: "Material Requirements Planning menghitung kebutuhan bahan untuk dependent demand (permintaan yang bergantung pada produk lain). Inputnya adalah jadwal produksi induk (MPS), daftar komponen (BOM), dan catatan persediaan.",
    },
    {
      kind: "order", id: "o3-mrp-order", chapter: 3,
      prompt: "Urutkan alur kerja MRP:",
      steps: [
        "Master Production Schedule (MPS): mau memproduksi apa dan kapan",
        "Bills of Material (BOM): butuh komponen apa saja",
        "Periksa catatan persediaan dan lead time",
        "Hitung kebutuhan bersih tiap komponen",
      ],
      explain: "MRP berjalan dari MPS, lalu dipecah lewat BOM, dikurangi stok yang ada, baru ditemukan kebutuhan bersih yang harus dipesan atau diproduksi.",
    },
    {
      kind: "explain", id: "o3-sched", chapter: 3, icon: "Clock",
      heading: "Penjadwalan jangka pendek",
      body: "Penjadwalan menentukan urutan dan waktu pekerjaan di mesin. Forward scheduling dimulai dari sekarang lalu maju ke depan, sedangkan backward scheduling dimulai dari deadline lalu mundur ke belakang. Gantt chart membantu melihat beban tiap mesin.",
    },
    {
      kind: "check", id: "o3-johnson", chapter: 3,
      question: "Johnson's rule dipakai untuk apa?",
      options: [
        "Mengurutkan beberapa pekerjaan melalui dua mesin supaya total waktunya paling pendek",
        "Menghitung EOQ",
        "Memilih lokasi pabrik",
      ],
      answer: 0,
      explain: "Johnson's rule mencari urutan job di dua mesin (atau dua tahap) yang meminimalkan total makespan.",
    },
    {
      kind: "explain", id: "o3-lean", chapter: 3, icon: "Recycle",
      heading: "Lean: membuang yang sia-sia",
      body: "Lean operations berfokus menghilangkan waste dan variability supaya throughput naik. JIT (Just-in-Time) mendatangkan bahan tepat saat dibutuhkan saja, dan kanban mengatur aliran memakai sinyal tarik (pull).",
    },
    {
      kind: "explain", id: "o3-seq", chapter: 3, icon: "ListChecks",
      heading: "Aturan urutan kerja (sequencing)",
      body: "Saat banyak job mengantre di satu mesin: FCFS (urut kedatangan), SPT (yang terpendek dikerjakan dulu), EDD (deadline terdekat dulu), LPT (yang terpanjang dulu). Setiap aturan punya kelebihannya masing-masing.",
    },
    {
      kind: "check", id: "o3-spt", chapter: 3,
      question: "Kita mau meminimalkan rata-rata waktu penyelesaian (flow time) semua job. Aturan yang mana?",
      options: ["SPT (Shortest Processing Time)", "LPT (Longest Processing Time)", "Diacak saja"],
      answer: 0,
      explain: "SPT (mengerjakan yang terpendek dulu) biasanya menghasilkan rata-rata flow time dan jumlah job yang menunggu paling kecil.",
    },
    {
      kind: "explain", id: "o3-maint", chapter: 3, icon: "Wrench",
      heading: "Maintenance & reliability",
      body: "Breakdown maintenance berarti memperbaiki setelah rusak (mahal dan mengganggu). Preventive maintenance berarti servis terjadwal sebelum rusak. Reliability adalah peluang sistem berjalan tanpa gagal, dan menambah komponen cadangan (redundancy) akan menaikkan keandalannya.",
    },
    {
      kind: "swipe", id: "o3-swipe", chapter: 3, prompt: "Benar atau salah?",
      statements: [
        { text: "JIT menyimpan stok sebanyak-banyaknya supaya aman.", isTrue: false, note: "Justru sebaliknya: JIT meminimalkan stok, dan bahan datang tepat saat dibutuhkan." },
        { text: "Kanban memakai sinyal tarik (pull) untuk mengatur aliran kerja.", isTrue: true },
        { text: "Predictive maintenance menyervis sebelum mesin rusak, bukan menunggu sampai rusak.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Apa benang merah dari perencanaan dan operasi?",
      options: [
        "Cocokkan produksi dengan permintaan (lewat aggregate, MRP, dan jadwal) sambil membuang pemborosan (lean)",
        "Produksi sebanyak mungkin tanpa rencana",
        "Stok dan waktu menganggur yang makin banyak makin bagus",
      ],
      answer: 0,
      explain: "Tepat. Mulai dari rencana kapasitas, kebutuhan bahan, sampai jadwal, semuanya tentang menyesuaikan diri dengan permintaan dengan pemborosan sekecil mungkin.",
    },
  ],
};
