import type { SubjectKilat } from "@/types";

// Belajar Kilat feed for Accounting for Business (s2-uas-bm).
// Source: rangkuman akuntansi-m1..m5. Character: table-heavy + managerial calc.
// Signature minigame = table (walkthrough + fill). Voice santai, 1 ide/kartu.

export const akuntansiKilat: SubjectKilat = {
  subjectId: "akuntansi",
  title: "Accounting for Business",
  chapters: [
    { n: 1, title: "Akuntansi Manajerial & Biaya", subtitle: "Jenis-jenis biaya pabrik dan bagaimana COGM disusun." },
    { n: 2, title: "Cost-Volume-Profit", subtitle: "Contribution margin, break-even, dan margin of safety." },
    { n: 3, title: "Keputusan, Budget & Kontrol", subtitle: "Incremental analysis, master budget, sampai ROI." },
  ],
  cards: [
    // ============ BAB 1: Akuntansi Manajerial & Biaya ============
    { kind: "intro", id: "a1-intro", chapter: 1, title: "Akuntansi Manajerial & Biaya", subtitle: "Berbeda dengan financial accounting. Yang ini dipakai orang dalam perusahaan untuk mengambil keputusan." },
    {
      kind: "explain", id: "a1-vs", chapter: 1, icon: "Building2",
      heading: "Managerial vs Financial",
      body: "Financial accounting ditujukan untuk pihak luar, mengikuti aturan GAAP, dan terbit secara berkala. Managerial accounting ditujukan untuk pihak dalam (para manajer), formatnya bebas, dan bisa dibuat sedetail dan sesering yang dibutuhkan.",
    },
    {
      kind: "swipe", id: "a1-swipe-vs", chapter: 1, prompt: "Financial atau managerial? (Benar = pernyataannya tepat)",
      statements: [
        { text: "Laporan managerial accounting wajib mengikuti GAAP.", isTrue: false, note: "Salah. Yang wajib mengikuti GAAP adalah financial accounting." },
        { text: "Managerial accounting bisa terbit sesering yang dibutuhkan.", isTrue: true },
        { text: "Tiga fungsi manajemen adalah planning, directing, dan controlling.", isTrue: true },
      ],
    },
    {
      kind: "explain", id: "a1-mfg", chapter: 1, icon: "Factory",
      heading: "Tiga komponen biaya pabrik",
      body: "Manufacturing costs = Direct Materials (bahan yang melekat di produk) + Direct Labor (tenaga kerja langsung) + Manufacturing Overhead (biaya pabrik tidak langsung, yaitu sisanya).",
    },
    {
      kind: "categorize", id: "a1-classify", chapter: 1,
      prompt: "Di pabrik snowboard, setiap biaya ini masuk ke mana?",
      buckets: ["Direct Material", "Direct Labor", "Overhead", "Period"],
      items: [
        { text: "Kayu, fiberglass, resin", bucket: 0 },
        { text: "Upah memotong dan membentuk papan", bucket: 1 },
        { text: "Penyusutan alat pabrik", bucket: 2 },
        { text: "Iklan", bucket: 3 },
        { text: "Komisi penjualan", bucket: 3 },
        { text: "Gaji manajer pabrik", bucket: 2 },
      ],
      explain: "DM melekat secara fisik di produk, DL adalah tenaga kerja langsung, dan overhead adalah biaya pabrik tidak langsung. Iklan dan komisi termasuk period cost, jadi bukan biaya produksi.",
    },
    {
      kind: "explain", id: "a1-pp", chapter: 1, icon: "Receipt",
      heading: "Product cost vs Period cost",
      body: "Product cost (DM + DL + overhead) melekat ke produk, masuk ke inventory dulu, lalu menjadi beban (COGS) saat barangnya terjual. Period cost (selling + admin) langsung menjadi beban di periode itu juga.",
    },
    {
      kind: "calc", id: "a1-totmfg", chapter: 1, mode: "pick",
      tag: "Hitung", question: "Material $300.000 + Labor $400.000 + Overhead $146.000. Berapa total manufacturing costs?",
      formula: "$\\text{DM} + \\text{DL} + \\text{Overhead}$",
      options: ["$846.000", "$926.000", "$700.000", "$446.000"],
      answer: 0,
      steps: ["300.000 + 400.000 + 146.000 = 846.000.", "Iklan, komisi, dan ongkos kirim TIDAK ikut dihitung karena itu period cost."],
      explain: "Hanya 3 komponen produksi yang dijumlahkan, hasilnya $846.000. Period cost tidak ikut.",
    },
    {
      kind: "table", id: "a1-cogm-walk", chapter: 1, mode: "walkthrough",
      title: "Skedul COGM (Keystone, Maret)",
      columns: ["Komponen", "USD"],
      rows: [
        ["Raw materials available (12.000 + 90.000)", 102000],
        ["- Raw materials akhir", 10000],
        ["= Direct materials used", 92000],
        ["+ Direct labor", 75000],
        ["+ Manufacturing overhead", 220000],
        ["= Total manufacturing costs", 387000],
        ["+ Work in process awal", 2500],
        ["= Total cost of work in process", 389500],
        ["- Work in process akhir", 4000],
        ["= Cost of goods manufactured", 385500],
      ],
      notes: [
        "Mulai dari bahan: yang tersedia dikurangi sisa di akhir periode, hasilnya direct materials used.",
        "Tambahkan direct labor dan overhead, hasilnya total manufacturing costs.",
        "Tambahkan WIP awal, lalu kurangi WIP akhir, hasilnya COGM, yaitu barang yang selesai diproduksi.",
      ],
    },
    {
      kind: "table", id: "a1-cogm-fill", chapter: 1, mode: "fill",
      title: "Lengkapi total manufacturing costs",
      columns: ["Komponen", "USD"],
      rows: [
        ["Direct materials used", 92000],
        ["Direct labor", 75000],
        ["Manufacturing overhead", 220000],
        ["Total manufacturing costs", 0],
      ],
      blank: [3, 1],
      options: ["$387.000", "$385.500", "$307.000", "$167.000"],
      answer: 0,
      explain: "92.000 + 75.000 + 220.000 = $387.000. Inilah total biaya produksi periode ini, sebelum disesuaikan dengan WIP.",
    },
    {
      kind: "checkpoint", id: "a1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Apa inti dari Bab 1 tentang biaya pabrik?",
      options: [
        "Biaya produksi = DM + DL + Overhead (product cost), sedangkan selling dan admin termasuk period cost",
        "Semua biaya perusahaan masuk ke manufacturing cost",
        "Iklan dan komisi termasuk direct material",
      ],
      answer: 0,
      explain: "Tepat. Hanya 3 komponen produksi yang menjadi product cost. Period cost langsung dibebankan dan tidak melekat ke produk.",
    },

    // ============ BAB 2: Cost-Volume-Profit ============
    { kind: "intro", id: "a2-intro", chapter: 2, title: "Cost-Volume-Profit", subtitle: "Hubungan antara biaya, volume, dan laba: kapan sebuah usaha balik modal?" },
    {
      kind: "explain", id: "a2-behav", chapter: 2, icon: "TrendingUp",
      heading: "Variable, Fixed, Mixed",
      body: "Variable cost: totalnya naik turun mengikuti volume, tapi per unitnya tetap. Fixed cost: totalnya tetap, tapi per unitnya makin kecil saat volume naik. Mixed cost: gabungan keduanya.",
    },
    {
      kind: "categorize", id: "a2-behav-cat", chapter: 2,
      prompt: "Bagaimana perilaku biaya-biaya ini?",
      buckets: ["Variable", "Fixed", "Mixed"],
      items: [
        { text: "Direct materials", bucket: 0 },
        { text: "Penyusutan (depreciation)", bucket: 1 },
        { text: "Tagihan listrik pabrik (ada abonemen + pemakaian)", bucket: 2 },
        { text: "Sewa gedung (rent)", bucket: 1 },
        { text: "Direct labor", bucket: 0 },
      ],
      explain: "Bahan dan tenaga kerja langsung bersifat variable. Sewa dan penyusutan bersifat fixed. Listrik yang punya bagian tetap ditambah bagian pemakaian bersifat mixed.",
    },
    {
      kind: "explain", id: "a2-cm", chapter: 2, icon: "DollarSign",
      heading: "Contribution margin",
      body: "$\\text{Contribution margin} = \\text{Sales} - \\text{Variable costs}$. Inilah sisa yang dipakai untuk menutup fixed cost, dan sisanya baru menjadi laba. Per unitnya: harga jual dikurangi variable cost per unit.",
    },
    {
      kind: "table", id: "a2-cvp-fill", chapter: 2, mode: "fill",
      title: "CVP income statement (Vargo, 1.600 unit)",
      columns: ["", "USD"],
      rows: [
        ["Sales", 800000],
        ["Variable costs", 480000],
        ["Contribution margin", 0],
        ["Fixed costs", 200000],
        ["Net income", 120000],
      ],
      blank: [2, 1],
      options: ["$320.000", "$280.000", "$200.000", "$120.000"],
      answer: 0,
      explain: "Contribution margin = Sales 800.000 - Variable 480.000 = $320.000. Setelah dikurangi fixed 200.000, sisa net income-nya 120.000.",
    },
    {
      kind: "calc", id: "a2-cmratio", chapter: 2, mode: "type",
      tag: "Hitung", question: "Harga jual $500, variable cost $300 per unit. Berapa contribution margin ratio-nya? (dalam persen, tulis angkanya saja)",
      formula: "$\\text{CM ratio} = \\dfrac{\\text{harga} - \\text{variable}}{\\text{harga}}$", answer: "40", unit: "%",
      steps: ["CM per unit = 500 - 300 = 200", "200 / 500 = 0,40 = 40%."],
      explain: "Setiap $1 penjualan, 40 sen menyumbang untuk menutup fixed cost dan menjadi laba.",
    },
    {
      kind: "explain", id: "a2-be", chapter: 2, icon: "Target",
      heading: "Break-even point",
      body: "Titik di mana total revenue sama dengan total cost, sehingga labanya nol. $\\text{BEP unit} = \\dfrac{\\text{Fixed}}{\\text{CM per unit}}$, dan $\\text{BEP rupiah} = \\dfrac{\\text{Fixed}}{\\text{CM ratio}}$.",
    },
    {
      kind: "calc", id: "a2-be-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "Lombardi: harga $400, variable $240, fixed $180.000. Break-even-nya berapa unit?",
      formula: "$\\text{BEP unit} = \\dfrac{\\text{Fixed}}{\\text{harga} - \\text{variable}}$",
      options: ["1.125 unit", "750 unit", "450 unit", "1.500 unit"],
      answer: 0,
      steps: ["Unit CM = 400 - 240 = 160", "180.000 / 160 = 1.125 unit."],
      explain: "Setiap unit menyumbang $160. Untuk menutup fixed cost $180.000 dibutuhkan 1.125 unit. Setelah angka itu, baru perusahaan mulai untung.",
    },
    {
      kind: "calc", id: "a2-highlow", chapter: 2, mode: "type",
      tag: "Hitung", question: "High-low: biaya $63.000 saat 50.000 mil, dan $30.000 saat 20.000 mil. Berapa variable cost per mil? (tulis angkanya saja)",
      formula: "$\\dfrac{\\text{biaya high} - \\text{biaya low}}{\\text{kegiatan high} - \\text{kegiatan low}}$", answer: "1.10", unit: "USD/mil",
      steps: ["(63.000 - 30.000) / (50.000 - 20.000)", "33.000 / 30.000 = 1,10 per mil."],
      explain: "Selisih biaya dibagi selisih kegiatan menghasilkan bagian variable-nya, yaitu $1,10 per mil.",
    },
    {
      kind: "explain", id: "a2-mos", chapter: 2, icon: "ShieldCheck",
      heading: "Margin of safety",
      body: "Margin of safety adalah jarak antara penjualan aktual dan titik break-even. Semakin besar jaraknya, semakin aman perusahaan dari kerugian. Rasionya = (penjualan aktual - break-even) / penjualan aktual.",
    },
    {
      kind: "explain", id: "a2-oplev", chapter: 2, icon: "Gauge",
      heading: "Operating leverage",
      body: "Operating leverage menunjukkan seberapa peka laba terhadap perubahan penjualan. Semakin besar porsi fixed cost, semakin tinggi leverage-nya: saat penjualan naik laba ikut melonjak, tapi saat turun laba bisa anjlok. Degree of Operating Leverage = Contribution Margin dibagi Net Income.",
    },
    {
      kind: "calc", id: "a2-dol", chapter: 2, mode: "pick", tag: "Hitung",
      question: "Contribution margin $600.000, net income $200.000. Berapa degree of operating leverage-nya?",
      formula: "$\\text{DOL} = \\dfrac{\\text{Contribution Margin}}{\\text{Net Income}}$",
      options: ["3,0", "1,5", "0,33", "$800.000"],
      answer: 0,
      steps: ["600.000 / 200.000 = 3,0."],
      explain: "DOL sebesar 3 artinya setiap penjualan naik 1%, laba naik sekitar 3%. Leverage yang tinggi berarti peka: untung besar saat penjualan naik, tapi berisiko saat penjualan turun.",
    },
    {
      kind: "check", id: "a2-mix", chapter: 2,
      question: "Saat menjual lebih dari satu produk, break-even dihitung menggunakan...",
      options: [
        "Weighted-average contribution margin (CM rata-rata tertimbang dari sales mix)",
        "Hanya CM produk yang termahal",
        "Tidak bisa dihitung kalau produknya lebih dari satu",
      ],
      answer: 0,
      explain: "Setiap produk punya CM yang berbeda, jadi kita hitung dulu weighted-average unit CM, baru fixed cost dibagi angka itu untuk mendapatkan break-even total.",
    },
    {
      kind: "swipe", id: "a2-swipe", chapter: 2, prompt: "Benar atau salah?",
      statements: [
        { text: "Pada titik break-even, total contribution margin sama dengan fixed costs.", isTrue: true },
        { text: "Menurunkan harga jual membuat break-even point ikut turun (jadi lebih mudah balik modal).", isTrue: false, note: "Justru sebaliknya: harga turun membuat CM per unit turun, sehingga break-even NAIK." },
        { text: "Margin of safety yang lebih besar berarti lebih aman.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "a2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Mana rumus inti dari CVP?",
      options: [
        "Break-even (unit) $= \\dfrac{\\text{Fixed}}{\\text{CM per unit}}$",
        "Break-even (unit) = Fixed costs x harga jual",
        "Contribution margin = Sales + Variable costs",
      ],
      answer: 0,
      explain: "Tepat. CM dipakai untuk menutup fixed cost dulu, jadi break-even = fixed dibagi CM per unit. CM sendiri = Sales dikurangi (bukan ditambah) variable.",
    },

    // ============ BAB 3: Keputusan, Budget & Kontrol ============
    { kind: "intro", id: "a3-intro", chapter: 3, title: "Keputusan, Budget & Kontrol", subtitle: "Incremental analysis, menyusun budget, dan mengukur kinerja." },
    {
      kind: "explain", id: "a3-incr", chapter: 3, icon: "Scale",
      heading: "Incremental analysis",
      body: "Untuk mengambil keputusan, yang kita lihat hanya biaya dan pendapatan yang BERUBAH antar pilihan (disebut relevant). Sunk cost, yaitu biaya yang sudah terlanjur keluar, kita abaikan.",
    },
    {
      kind: "categorize", id: "a3-relevant", chapter: 3,
      prompt: "Untuk keputusan mengganti mesin: mana yang relevan dan mana yang tidak?",
      buckets: ["Relevan", "Abaikan"],
      items: [
        { text: "Harga beli mesin baru", bucket: 0 },
        { text: "Harga beli mesin lama dulu (sudah terbayar)", bucket: 1 },
        { text: "Penghematan biaya operasi tiap tahun", bucket: 0 },
        { text: "Nilai jual sisa mesin lama saat ini", bucket: 0 },
      ],
      explain: "Yang relevan adalah hal yang masih bisa berubah ke depan. Harga beli mesin lama adalah sunk cost yang sudah berlalu, jadi diabaikan.",
    },
    {
      kind: "scenario", id: "a3-makebuy", chapter: 3, tag: "Make or Buy",
      situation: "Sebuah komponen bisa dibuat sendiri dengan variable cost $12 per unit, atau dibeli seharga $14 per unit. Kapasitas pabrik sedang menganggur dan fixed cost-nya tetap berjalan apa pun pilihannya. Mana yang lebih murah?",
      choices: [
        { text: "Buat sendiri ($12 < $14)", correct: true, feedback: "Betul. Fixed cost tetap berjalan, jadi tidak relevan, dan kita tinggal membandingkan variable $12 dengan harga beli $14. Membuat sendiri lebih hemat." },
        { text: "Beli saja seharga $14", correct: false, feedback: "Itu lebih mahal $2 per unit. Karena fixed cost tetap berjalan, yang relevan hanya variable $12 dibanding harga beli $14." },
        { text: "Tidak bisa ditentukan", correct: false, feedback: "Bisa ditentukan: abaikan fixed cost yang tetap berjalan, lalu bandingkan biaya yang berubah. $12 < $14." },
      ],
      follow: {
        situation: "Ternyata kalau berhenti membuat sendiri, kapasitas yang menganggur itu bisa disewakan seharga $5.000. Apakah ini mengubah keputusan?",
        choices: [
          { text: "Iya, sewa $5.000 menjadi opportunity cost yang relevan", correct: true, feedback: "Tepat. Pendapatan yang hilang (opportunity cost) ikut dihitung dalam incremental analysis." },
          { text: "Tidak berpengaruh sama sekali", correct: false, feedback: "Berpengaruh. Opportunity cost, yaitu pemasukan yang dilepas, termasuk relevan." },
        ],
      },
    },
    {
      kind: "explain", id: "a3-budget", chapter: 3, icon: "ClipboardList",
      heading: "Master budget",
      body: "Master budget adalah rangkaian budget yang saling terhubung. Semuanya dimulai dari budget penjualan, karena rencana produksi, bahan, dan tenaga kerja semuanya mengikuti perkiraan penjualan.",
    },
    {
      kind: "order", id: "a3-budget-order", chapter: 3,
      prompt: "Urutkan langkah penyusunan master budget:",
      steps: [
        "Sales budget (perkiraan penjualan)",
        "Production budget (mau memproduksi berapa)",
        "Direct materials budget (butuh bahan berapa)",
        "Budgeted income statement",
        "Cash budget",
      ],
      explain: "Semuanya mengalir dari sales budget. Setelah tahu mau menjual berapa, kita tentukan produksi berapa, lalu bahan berapa, baru bisa memproyeksikan laba dan kas.",
    },
    {
      kind: "explain", id: "a3-flex", chapter: 3, icon: "Gauge",
      heading: "Static vs Flexible budget",
      body: "Static budget dibuat untuk satu tingkat kegiatan saja. Flexible budget menyesuaikan diri dengan kegiatan yang benar-benar terjadi, sehingga perbandingannya lebih adil saat mengevaluasi kinerja.",
    },
    {
      kind: "multi", id: "a3-roi", chapter: 3,
      question: "Tentang ROI (Return on Investment) di investment center, mana yang benar? Pilih semua.",
      options: [
        "ROI = Controllable margin / Average operating assets",
        "ROI naik kalau kita bisa menaikkan margin tanpa menambah aset",
        "ROI selalu lebih bagus daripada residual income dalam segala kasus",
        "ROI dipakai untuk menilai kinerja investment center",
      ],
      answers: [0, 1, 3],
      explain: "ROI = margin dibagi aset, akan naik kalau margin naik atau aset dipakai lebih efisien, dan dipakai untuk investment center. Namun ROI tidak selalu lebih unggul dari residual income.",
    },
    {
      kind: "check", id: "a3-special", chapter: 3,
      question: "Ada pesanan khusus (special order) dengan harga di bawah harga normal, dan kapasitas sedang menganggur. Apa yang dipertimbangkan?",
      options: [
        "Bandingkan harga tawaran dengan biaya incremental (variable); fixed cost yang tetap berjalan diabaikan",
        "Tolak saja, karena harga di bawah normal pasti rugi",
        "Hitung memakai total biaya termasuk semua fixed cost",
      ],
      answer: 0,
      explain: "Kalau kapasitas menganggur dan harga tawaran masih di atas biaya variable per unit, pesanan itu justru menambah laba. Fixed cost yang tetap berjalan tidak relevan.",
    },
    {
      kind: "check", id: "a3-respcenter", chapter: 3,
      question: "Investment center (divisi yang punya aset dan investasi sendiri) dinilai memakai...",
      options: [
        "ROI atau residual income",
        "Hanya total biaya",
        "Jumlah karyawan",
      ],
      answer: 0,
      explain: "Cost center dinilai dari pengendalian biaya, profit center dari laba, dan investment center dari ROI atau residual income (laba relatif terhadap aset yang dipakai).",
    },
    {
      kind: "swipe", id: "a3-swipe", chapter: 3, prompt: "Benar atau salah?",
      statements: [
        { text: "Sunk cost diabaikan dalam incremental analysis.", isTrue: true },
        { text: "Master budget dimulai dari cash budget.", isTrue: false, note: "Master budget dimulai dari sales budget, bukan cash budget." },
        { text: "Flexible budget menyesuaikan diri dengan tingkat kegiatan aktual.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "a3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Apa benang merah dari keputusan dan kontrol?",
      options: [
        "Fokus pada biaya yang berubah (relevan), rencanakan lewat budget yang berurutan, lalu ukur kinerjanya",
        "Selalu produksi sendiri, jangan pernah membeli dari luar",
        "Sunk cost selalu ikut dihitung dalam setiap keputusan",
      ],
      answer: 0,
      explain: "Tepat. Keputusan memakai biaya yang relevan (bukan sunk cost), perencanaan lewat master budget, dan kontrol lewat flexible budget serta ROI.",
    },
  ],
};
