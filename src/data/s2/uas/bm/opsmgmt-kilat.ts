import type { SubjectKilat } from "@/types";

// Belajar Kilat feed for Operations Management (s2-uas-bm).
// Source: rangkuman opsmgmt-m1..m6. Character: calculation-heavy. Signature
// minigame = calc (pick + type). Voice santai, 1 ide/kartu, tanpa em-dash.

export const opsmgmtKilat: SubjectKilat = {
  subjectId: "opsmgmt",
  title: "Operations Management",
  chapters: [
    { n: 1, title: "Strategi Lokasi", subtitle: "Milih lokasi pabrik, dan kenapa upah murah belum tentu biaya murah." },
    { n: 2, title: "Manajemen Persediaan", subtitle: "Berapa banyak pesan (EOQ) dan kapan pesan lagi (ROP)." },
    { n: 3, title: "Perencanaan & Operasi", subtitle: "Aggregate planning, MRP, penjadwalan, sampai lean." },
  ],
  cards: [
    // ============ BAB 1: Strategi Lokasi ============
    { kind: "intro", id: "o1-intro", chapter: 1, title: "Strategi Lokasi", subtitle: "Lokasi itu keputusan jangka panjang yang susah ditarik. Sekali salah, kerasa lama." },
    {
      kind: "explain", id: "o1-why", chapter: 1, icon: "MapPin",
      heading: "Lokasi nyetir biaya",
      body: "Lokasi ngaruh gede ke fixed cost (biaya tetap) dan variable cost (ikut jumlah produksi). Karena jarang diubah, milih lokasi yang pas itu investasi, bukan buang waktu.",
    },
    {
      kind: "explain", id: "o1-levels", chapter: 1, icon: "Layers",
      heading: "Milih lokasi itu bertingkat",
      body: "Dari milih negara, lalu wilayah, lalu site (lokasi persisnya). Tiap tingkat punya key success factor (KSF) sendiri.",
    },
    {
      kind: "categorize", id: "o1-ksf", chapter: 1,
      prompt: "Faktor ini biasanya dipikirin di tingkat mana?",
      buckets: ["Negara", "Wilayah", "Site"],
      items: [
        { text: "Risiko politik & nilai tukar", bucket: 0 },
        { text: "Biaya & ketersediaan tenaga kerja daerah", bucket: 1 },
        { text: "Aturan zonasi (zoning)", bucket: 2 },
        { text: "Insentif pajak & kedekatan bahan baku", bucket: 1 },
      ],
      explain: "Negara: hal makro (politik, kurs). Wilayah: tenaga kerja, pajak, dekat bahan baku. Site: detail tempat kayak zonasi dan akses jalan.",
    },
    {
      kind: "explain", id: "o1-prod", chapter: 1, icon: "Gauge",
      heading: "Upah murah, biaya belum tentu murah",
      body: "Yang penting bukan cuma upah, tapi produktivitas. Biaya tenaga kerja per unit = biaya tenaga kerja per hari dibagi unit per hari.",
    },
    {
      kind: "calc", id: "o1-calc-sc", chapter: 1, mode: "pick",
      tag: "Hitung", question: "South Carolina: upah USD 70/hari, hasil 60 unit/hari. Biaya tenaga kerja per unit?",
      formula: "biaya/hari ÷ unit/hari",
      options: ["USD 1,17", "USD 0,86", "USD 70", "USD 4.200"],
      answer: 0,
      steps: ["70 ÷ 60 = 1,17 per unit."],
      explain: "USD 70 dibagi 60 unit = USD 1,17 per unit.",
    },
    {
      kind: "calc", id: "o1-calc-mx", chapter: 1, mode: "type",
      tag: "Hitung", question: "Mexico: upah USD 25/hari, tapi cuma 20 unit/hari. Biaya tenaga kerja per unit? (angka aja)",
      formula: "biaya/hari ÷ unit/hari", answer: "1.25", unit: "USD",
      steps: ["25 ÷ 20 = 1,25 per unit."],
      explain: "USD 25 dibagi 20 = USD 1,25. Walau upahnya jauh lebih murah dari SC, per unitnya malah lebih mahal karena produktivitas rendah.",
    },
    {
      kind: "scenario", id: "o1-scn", chapter: 1, tag: "Studi Kasus",
      situation: "Pabrik mau pindah. SC: USD 1,17 per unit. Mexico: USD 1,25 per unit. Mana yang dipilih kalau cuma lihat biaya tenaga kerja per unit?",
      choices: [
        { text: "South Carolina", correct: true, feedback: "Betul. 1,17 < 1,25. Produktivitas tinggi bikin SC lebih murah per unit walau upahnya lebih gede." },
        { text: "Mexico, kan upahnya murah", correct: false, feedback: "Upah murah itu jebakan. Per unitnya justru lebih mahal karena produktivitas rendah." },
        { text: "Sama aja", correct: false, feedback: "Beda: 1,17 vs 1,25 per unit. SC menang." },
      ],
    },
    {
      kind: "explain", id: "o1-cvl", chapter: 1, icon: "Calculator",
      heading: "Locational cost-volume analysis",
      body: "Bandingin lokasi pakai Total Cost = Fixed Cost + (Variable Cost x Volume). Titik temu (crossover) antar lokasi nunjukin lokasi mana yang termurah di rentang volume tertentu.",
    },
    {
      kind: "calc", id: "o1-calc-cross", chapter: 1, mode: "pick",
      tag: "Hitung", question: "Athens: 30.000 + 75x. Brussels: 60.000 + 45x. Di volume (x) berapa biayanya sama?",
      formula: "30.000 + 75x = 60.000 + 45x",
      options: ["1.000 unit", "2.500 unit", "750 unit", "30.000 unit"],
      answer: 0,
      steps: ["30.000 + 75x = 60.000 + 45x", "30x = 30.000", "x = 1.000 unit."],
      explain: "Selisih fixed cost 30.000 dibagi selisih variable cost 30 = 1.000 unit. Di bawah 1.000 Athens termurah, di atasnya Brussels.",
    },
    {
      kind: "swipe", id: "o1-swipe", chapter: 1, prompt: "Bener atau salah?",
      statements: [
        { text: "Center-of-gravity dipakai buat nyari lokasi pusat distribusi yang biaya kirimnya paling kecil.", isTrue: true },
        { text: "Clustering itu jauhin pabrik dari pesaing.", isTrue: false, note: "Clustering justru ngumpul deket pesaing (contoh Silicon Valley)." },
        { text: "Intangible cost contohnya kualitas hidup dan transportasi umum.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Pelajaran inti Bab 1 soal lokasi & biaya tenaga kerja:",
      options: [
        "Yang dilihat biaya per unit (upah dibagi produktivitas), bukan upah doang",
        "Selalu pilih lokasi dengan upah paling murah",
        "Lokasi gak ngaruh ke biaya",
      ],
      answer: 0,
      explain: "Tepat. Upah murah + produktivitas rendah bisa bikin biaya per unit malah mahal. Selalu hitung per unit.",
    },

    // ============ BAB 2: Manajemen Persediaan ============
    { kind: "intro", id: "o2-intro", chapter: 2, title: "Manajemen Persediaan", subtitle: "Cari keseimbangan: stok kebanyakan boros, kedikitan bikin kehabisan." },
    {
      kind: "explain", id: "o2-goal", chapter: 2, icon: "Boxes",
      heading: "Inti persediaan: keseimbangan",
      body: "Tujuannya nyeimbangin uang yang ketanam di stok sama pelayanan ke pelanggan. Persediaan bisa nyampe 50% modal yang ditanam, jadi gak bisa asal banyak.",
    },
    {
      kind: "categorize", id: "o2-types", chapter: 2,
      prompt: "Masukin tiap barang ke jenis persediaannya:",
      buckets: ["Raw material", "WIP", "MRO", "Finished goods"],
      items: [
        { text: "Baja yang baru dibeli, belum diproses", bucket: 0 },
        { text: "Rangka setengah jadi di lini produksi", bucket: 1 },
        { text: "Oli pelumas buat ngerawat mesin", bucket: 2 },
        { text: "Sepatu jadi yang tinggal dikirim", bucket: 3 },
      ],
      explain: "Raw = belum diproses, WIP = lagi diproses, MRO = buat ngerawat mesin/proses, Finished = produk jadi siap kirim.",
    },
    {
      kind: "explain", id: "o2-abc", chapter: 2, icon: "ClipboardList",
      heading: "ABC analysis",
      body: "Bagi stok by annual dollar volume (unit x harga). Class A: sedikit barang (~20%) tapi ~72% nilai. Class C: banyak barang tapi nilainya kecil. Fokusin perhatian ke A.",
    },
    {
      kind: "table", id: "o2-abc-table", chapter: 2, mode: "fill",
      title: "Annual dollar volume",
      columns: ["Item", "Unit", "Harga", "Nilai/th"],
      rows: [["10286", 1000, "$90", 0]],
      blank: [0, 3],
      options: ["$90.000", "$1.090", "$900", "$90"],
      answer: 0,
      explain: "1.000 unit x USD 90 = USD 90.000. Nilai gede gini bikin item ini masuk Class A.",
    },
    {
      kind: "explain", id: "o2-eoq", chapter: 2, icon: "Calculator",
      heading: "EOQ: berapa banyak pesan",
      body: "Economic Order Quantity nyari jumlah pesan paling hemat, pas holding cost = setup cost. Rumusnya Q* = akar dari (2DS/H).",
    },
    {
      kind: "calc", id: "o2-eoq-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "D = 1.000, S = USD 10/order, H = USD 0,50/unit/th. Berapa EOQ (Q*)?",
      formula: "Q* = akar(2DS / H)",
      options: ["200 unit", "400 unit", "100 unit", "40.000 unit"],
      answer: 0,
      steps: ["2 x 1.000 x 10 / 0,50 = 40.000", "akar 40.000 = 200 unit."],
      explain: "Akar dari 40.000 = 200 unit. Itu jumlah pesan paling hemat.",
    },
    {
      kind: "calc", id: "o2-avg", chapter: 2, mode: "type",
      tag: "Hitung", question: "Kalau EOQ-nya 200 unit, rata-rata stok (Q/2) berapa? (angka aja)",
      formula: "rata-rata stok = Q / 2", answer: "100",
      steps: ["200 ÷ 2 = 100 unit."],
      explain: "Stok turun dari Q ke 0 berulang, jadi rata-ratanya Q/2 = 100 unit.",
    },
    {
      kind: "explain", id: "o2-rop", chapter: 2, icon: "Clock",
      heading: "ROP: kapan pesan lagi",
      body: "Reorder Point jawab 'kapan'. ROP = d x L, dengan d = permintaan per hari dan L = lead time (hari nunggu barang datang).",
    },
    {
      kind: "calc", id: "o2-rop-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "8.000 unit/tahun, 250 hari kerja, lead time 3 hari. ROP?",
      formula: "d = D / hari kerja, lalu ROP = d x L",
      options: ["96 unit", "128 unit", "32 unit", "24.000 unit"],
      answer: 0,
      steps: ["d = 8.000 / 250 = 32 per hari", "ROP = 32 x 3 = 96 unit."],
      explain: "Per hari 32 unit, dikali lead time 3 hari = 96. Pas stok nyentuh 96, pesan lagi.",
    },
    {
      kind: "explain", id: "o2-ss", chapter: 2, icon: "Package",
      heading: "Safety stock buat jaga-jaga",
      body: "Kalau permintaan gak pasti, tambahin safety stock biar gak kehabisan. ROP = d x L + safety stock. Makin tinggi service level yang dimau, makin gede safety stock-nya.",
    },
    {
      kind: "swipe", id: "o2-swipe", chapter: 2, prompt: "Bener atau salah?",
      statements: [
        { text: "EOQ jawab 'berapa banyak', ROP jawab 'kapan'.", isTrue: true },
        { text: "Quantity discount selalu untung karena harga per unit turun.", isTrue: false, note: "Holding cost naik karena stok jadi banyak, jadi harus dihitung total." },
        { text: "Class A sebaiknya dikontrol lebih ketat daripada Class C.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Dua angka kunci manajemen persediaan:",
      options: [
        "EOQ = akar(2DS/H) buat 'berapa', ROP = d x L buat 'kapan'",
        "EOQ buat 'kapan', ROP buat 'berapa'",
        "Pesan sebanyak-banyaknya biar gak kehabisan",
      ],
      answer: 0,
      explain: "Pas. EOQ = jumlah hemat, ROP = titik pesan ulang. Stok kebanyakan malah boros holding cost.",
    },

    // ============ BAB 3: Perencanaan & Operasi ============
    { kind: "intro", id: "o3-intro", chapter: 3, title: "Perencanaan & Operasi", subtitle: "Dari rencana kapasitas, kebutuhan bahan, penjadwalan, sampai lean." },
    {
      kind: "explain", id: "o3-agg", chapter: 3, icon: "ClipboardList",
      heading: "Aggregate planning & S&OP",
      body: "Aggregate planning nyusun rencana produksi jangka menengah (biasanya 3-18 bulan) biar pas sama permintaan dengan biaya kecil. S&OP nyatuin rencana penjualan dan operasi biar sejalan.",
    },
    {
      kind: "categorize", id: "o3-options", chapter: 3,
      prompt: "Ini termasuk ngutak-atik kapasitas atau permintaan?",
      buckets: ["Pilihan Kapasitas", "Pilihan Permintaan"],
      items: [
        { text: "Lembur (overtime) / nambah shift", bucket: 0 },
        { text: "Pengaruhi permintaan lewat promo & harga", bucket: 1 },
        { text: "Hiring / firing pekerja", bucket: 0 },
        { text: "Backorder pas lagi sibuk", bucket: 1 },
        { text: "Subkontrak ke pihak lain", bucket: 0 },
      ],
      explain: "Pilihan kapasitas = atur sisi produksi (lembur, hiring, subkontrak). Pilihan permintaan = geser/atur permintaan (promo, backorder).",
    },
    {
      kind: "explain", id: "o3-mrp", chapter: 3, icon: "Factory",
      heading: "MRP: kebutuhan bahan",
      body: "Material Requirements Planning ngitung kebutuhan bahan buat dependent demand (permintaan yang gantung ke produk lain). Inputnya: jadwal produksi induk (MPS), daftar komponen (BOM), dan catatan persediaan.",
    },
    {
      kind: "order", id: "o3-mrp-order", chapter: 3,
      prompt: "Urutkan alur kerja MRP:",
      steps: [
        "Master Production Schedule (MPS): mau produksi apa & kapan",
        "Bills of Material (BOM): butuh komponen apa aja",
        "Cek catatan persediaan & lead time",
        "Hitung kebutuhan bersih tiap komponen",
      ],
      explain: "MRP jalan dari MPS, dipecah lewat BOM, dikurangi stok yang ada, baru ketemu kebutuhan bersih yang harus dipesan/diproduksi.",
    },
    {
      kind: "explain", id: "o3-sched", chapter: 3, icon: "Clock",
      heading: "Penjadwalan jangka pendek",
      body: "Nentuin urutan dan waktu kerjaan di mesin. Forward scheduling mulai dari sekarang maju ke depan; backward mulai dari deadline mundur ke belakang. Gantt chart bantu lihat beban tiap mesin.",
    },
    {
      kind: "check", id: "o3-johnson", chapter: 3,
      question: "Johnson's rule dipakai buat apa?",
      options: [
        "Ngurutin beberapa kerjaan lewat dua mesin biar total waktu paling pendek",
        "Ngitung EOQ",
        "Milih lokasi pabrik",
      ],
      answer: 0,
      explain: "Johnson's rule nyari urutan job di dua mesin (atau dua tahap) yang minimalin total makespan.",
    },
    {
      kind: "explain", id: "o3-lean", chapter: 3, icon: "Recycle",
      heading: "Lean: buang yang sia-sia",
      body: "Lean operations fokus ngilangin waste dan variability biar throughput naik. JIT (Just-in-Time) datengin bahan pas dibutuhin aja, dan kanban ngatur aliran pakai sinyal tarik (pull).",
    },
    {
      kind: "swipe", id: "o3-swipe", chapter: 3, prompt: "Bener atau salah?",
      statements: [
        { text: "JIT nyimpen stok sebanyak-banyaknya biar aman.", isTrue: false, note: "Kebalikannya: JIT minimalin stok, bahan datang pas dibutuhin." },
        { text: "Kanban pakai sinyal tarik (pull) buat ngatur aliran kerja.", isTrue: true },
        { text: "Predictive maintenance nyervis sebelum mesin rusak, bukan nunggu rusak.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "o3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Benang merah perencanaan & operasi:",
      options: [
        "Cocokin produksi sama permintaan (aggregate/MRP/jadwal) sambil buang pemborosan (lean)",
        "Produksi sebanyak mungkin tanpa rencana",
        "Stok dan waktu nganggur makin banyak makin bagus",
      ],
      answer: 0,
      explain: "Tepat. Dari rencana kapasitas, kebutuhan bahan, sampai jadwal, semuanya soal pas sama permintaan dengan boros sekecil mungkin.",
    },
  ],
};
