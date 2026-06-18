import type { SubjectKilat } from "@/types";

// Belajar Kilat feed for Accounting for Business (s2-uas-bm).
// Source: rangkuman akuntansi-m1..m5. Character: table-heavy + managerial calc.
// Signature minigame = table (walkthrough + fill). Voice santai, 1 ide/kartu.

export const akuntansiKilat: SubjectKilat = {
  subjectId: "akuntansi",
  title: "Accounting for Business",
  chapters: [
    { n: 1, title: "Akuntansi Manajerial & Biaya", subtitle: "Jenis biaya pabrik dan gimana COGM disusun." },
    { n: 2, title: "Cost-Volume-Profit", subtitle: "Contribution margin, break-even, dan margin of safety." },
    { n: 3, title: "Keputusan, Budget & Kontrol", subtitle: "Incremental analysis, master budget, sampai ROI." },
  ],
  cards: [
    // ============ BAB 1: Akuntansi Manajerial & Biaya ============
    { kind: "intro", id: "a1-intro", chapter: 1, title: "Akuntansi Manajerial & Biaya", subtitle: "Beda sama financial accounting: ini buat orang dalam ngambil keputusan." },
    {
      kind: "explain", id: "a1-vs", chapter: 1, icon: "Building2",
      heading: "Managerial vs Financial",
      body: "Financial accounting buat pihak luar, ikut aturan GAAP, terbit berkala. Managerial accounting buat pihak dalam (manajer), bebas formatnya, sedetail dan sesering yang dibutuhin.",
    },
    {
      kind: "swipe", id: "a1-swipe-vs", chapter: 1, prompt: "Financial atau managerial? (Benar = pernyataannya tepat)",
      statements: [
        { text: "Laporan managerial accounting wajib ikut GAAP.", isTrue: false, note: "Salah. Yang wajib GAAP itu financial accounting." },
        { text: "Managerial accounting bisa terbit sesering yang dibutuhin.", isTrue: true },
        { text: "Tiga fungsi manajemen: planning, directing, controlling.", isTrue: true },
      ],
    },
    {
      kind: "explain", id: "a1-mfg", chapter: 1, icon: "Factory",
      heading: "Tiga komponen biaya pabrik",
      body: "Manufacturing costs = Direct Materials (bahan yang nempel di produk) + Direct Labor (tenaga kerja langsung) + Manufacturing Overhead (biaya pabrik tak langsung, sisanya).",
    },
    {
      kind: "categorize", id: "a1-classify", chapter: 1,
      prompt: "Pabrik snowboard: tiap biaya ini masuk mana?",
      buckets: ["Direct Material", "Direct Labor", "Overhead", "Period"],
      items: [
        { text: "Kayu, fiberglass, resin", bucket: 0 },
        { text: "Upah motong & bentuk papan", bucket: 1 },
        { text: "Penyusutan alat pabrik", bucket: 2 },
        { text: "Iklan", bucket: 3 },
        { text: "Komisi penjualan", bucket: 3 },
        { text: "Gaji manajer pabrik", bucket: 2 },
      ],
      explain: "DM nempel fisik di produk, DL tenaga kerja langsung, overhead biaya pabrik tak langsung. Iklan & komisi itu period cost (bukan biaya produksi).",
    },
    {
      kind: "explain", id: "a1-pp", chapter: 1, icon: "Receipt",
      heading: "Product cost vs Period cost",
      body: "Product cost (DM+DL+overhead) nempel ke produk, masuk inventory dulu, jadi beban (COGS) pas barang kejual. Period cost (selling + admin) langsung jadi beban di periode itu juga.",
    },
    {
      kind: "calc", id: "a1-totmfg", chapter: 1, mode: "pick",
      tag: "Hitung", question: "Material $300.000 + Labor $400.000 + Overhead $146.000. Total manufacturing costs?",
      formula: "DM + DL + Overhead",
      options: ["$846.000", "$926.000", "$700.000", "$446.000"],
      answer: 0,
      steps: ["300.000 + 400.000 + 146.000 = 846.000.", "Iklan, komisi, ongkos kirim TIDAK masuk (itu period cost)."],
      explain: "Cuma 3 komponen produksi yang dijumlah = $846.000. Period cost dikecualiin.",
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
        "Mulai dari bahan: yang tersedia dikurangi sisa akhir = direct materials used.",
        "Tambah direct labor + overhead = total manufacturing costs.",
        "Tambah WIP awal, kurangi WIP akhir = COGM (barang yang kelar diproduksi).",
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
      explain: "92.000 + 75.000 + 220.000 = $387.000. Itu total biaya produksi periode ini, sebelum diutak-atik sama WIP.",
    },
    {
      kind: "checkpoint", id: "a1-cp", chapter: 1, title: "Checkpoint Bab 1",
      question: "Inti Bab 1 soal biaya pabrik:",
      options: [
        "Biaya produksi = DM + DL + Overhead (product cost); selling & admin itu period cost",
        "Semua biaya perusahaan masuk manufacturing cost",
        "Iklan dan komisi termasuk direct material",
      ],
      answer: 0,
      explain: "Tepat. Cuma 3 komponen produksi yang jadi product cost. Period cost langsung dibebanin, gak nempel ke produk.",
    },

    // ============ BAB 2: Cost-Volume-Profit ============
    { kind: "intro", id: "a2-intro", chapter: 2, title: "Cost-Volume-Profit", subtitle: "Hubungan biaya, volume, dan laba: kapan balik modal?" },
    {
      kind: "explain", id: "a2-behav", chapter: 2, icon: "TrendingUp",
      heading: "Variable, Fixed, Mixed",
      body: "Variable cost: total ikut naik-turun sama volume, tapi per unit tetap. Fixed cost: total tetap, tapi per unit makin kecil kalau volume naik. Mixed: campuran dua-duanya.",
    },
    {
      kind: "categorize", id: "a2-behav-cat", chapter: 2,
      prompt: "Biaya ini kelakuannya gimana?",
      buckets: ["Variable", "Fixed", "Mixed"],
      items: [
        { text: "Direct materials", bucket: 0 },
        { text: "Penyusutan (depreciation)", bucket: 1 },
        { text: "Tagihan listrik pabrik (ada abonemen + pemakaian)", bucket: 2 },
        { text: "Sewa gedung (rent)", bucket: 1 },
        { text: "Direct labor", bucket: 0 },
      ],
      explain: "Bahan & tenaga kerja langsung = variable. Sewa & penyusutan = fixed. Listrik yang ada bagian tetap + bagian ikut pakai = mixed.",
    },
    {
      kind: "explain", id: "a2-cm", chapter: 2, icon: "DollarSign",
      heading: "Contribution margin",
      body: "Contribution margin = Sales - Variable costs. Ini 'sisa' yang dipakai buat nutup fixed cost, baru sisanya jadi laba. Per unit: harga jual dikurangi variable cost per unit.",
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
      explain: "Contribution margin = Sales 800.000 - Variable 480.000 = $320.000. Dikurangi fixed 200.000, sisa net income 120.000.",
    },
    {
      kind: "calc", id: "a2-cmratio", chapter: 2, mode: "type",
      tag: "Hitung", question: "Harga jual $500, variable cost $300 per unit. Contribution margin ratio? (persen, angka aja)",
      formula: "CM ratio = (harga - variable) / harga", answer: "40", unit: "%",
      steps: ["CM per unit = 500 - 300 = 200", "200 / 500 = 0,40 = 40%."],
      explain: "Tiap $1 penjualan, 40 sen nyumbang buat nutup fixed cost dan laba.",
    },
    {
      kind: "explain", id: "a2-be", chapter: 2, icon: "Target",
      heading: "Break-even point",
      body: "Titik di mana total revenue = total cost (laba nol). Break-even (unit) = Fixed costs / unit contribution margin. Break-even (dollar) = Fixed costs / CM ratio.",
    },
    {
      kind: "calc", id: "a2-be-calc", chapter: 2, mode: "pick",
      tag: "Hitung", question: "Lombardi: harga $400, variable $240, fixed $180.000. Break-even berapa unit?",
      formula: "BEP unit = Fixed / (harga - variable)",
      options: ["1.125 unit", "750 unit", "450 unit", "1.500 unit"],
      answer: 0,
      steps: ["Unit CM = 400 - 240 = 160", "180.000 / 160 = 1.125 unit."],
      explain: "Tiap unit nyumbang $160. Buat nutup fixed $180.000 butuh 1.125 unit. Lewat itu baru untung.",
    },
    {
      kind: "calc", id: "a2-highlow", chapter: 2, mode: "type",
      tag: "Hitung", question: "High-low: biaya $63.000 di 50.000 mil, $30.000 di 20.000 mil. Variable cost per mil? (angka aja)",
      formula: "(biaya high - low) / (kegiatan high - low)", answer: "1.10", unit: "USD/mil",
      steps: ["(63.000 - 30.000) / (50.000 - 20.000)", "33.000 / 30.000 = 1,10 per mil."],
      explain: "Selisih biaya dibagi selisih kegiatan = bagian variable-nya, yaitu $1,10 per mil.",
    },
    {
      kind: "explain", id: "a2-mos", chapter: 2, icon: "ShieldCheck",
      heading: "Margin of safety",
      body: "Jarak antara penjualan aktual dan break-even. Makin gede, makin aman dari rugi. Ratio = (penjualan aktual - break-even) / penjualan aktual.",
    },
    {
      kind: "swipe", id: "a2-swipe", chapter: 2, prompt: "Bener atau salah?",
      statements: [
        { text: "Di break-even, contribution margin total = fixed costs.", isTrue: true },
        { text: "Nurunin harga jual bikin break-even point turun (lebih gampang balik modal).", isTrue: false, note: "Kebalikannya: harga turun -> CM per unit turun -> break-even NAIK." },
        { text: "Margin of safety yang lebih besar artinya lebih aman.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "a2-cp", chapter: 2, title: "Checkpoint Bab 2",
      question: "Rumus inti CVP:",
      options: [
        "Break-even (unit) = Fixed costs / unit contribution margin",
        "Break-even (unit) = Fixed costs x harga jual",
        "Contribution margin = Sales + Variable costs",
      ],
      answer: 0,
      explain: "Pas. CM nutup fixed dulu; break-even = fixed dibagi CM per unit. CM sendiri = Sales dikurangi (bukan ditambah) variable.",
    },

    // ============ BAB 3: Keputusan, Budget & Kontrol ============
    { kind: "intro", id: "a3-intro", chapter: 3, title: "Keputusan, Budget & Kontrol", subtitle: "Incremental analysis, nyusun budget, dan ngukur kinerja." },
    {
      kind: "explain", id: "a3-incr", chapter: 3, icon: "Scale",
      heading: "Incremental analysis",
      body: "Buat ngambil keputusan, yang dilihat cuma biaya & pendapatan yang BERUBAH antar pilihan (relevant). Sunk cost (biaya yang udah terlanjur keluar) diabaikan.",
    },
    {
      kind: "categorize", id: "a3-relevant", chapter: 3,
      prompt: "Buat keputusan ganti mesin: relevan atau gak?",
      buckets: ["Relevan", "Abaikan"],
      items: [
        { text: "Harga beli mesin baru", bucket: 0 },
        { text: "Harga beli mesin lama dulu (udah kebayar)", bucket: 1 },
        { text: "Hemat biaya operasi tiap tahun", bucket: 0 },
        { text: "Nilai jual sisa mesin lama sekarang", bucket: 0 },
      ],
      explain: "Yang relevan itu yang masih bisa berubah ke depan. Harga beli mesin lama = sunk cost, udah lewat, abaikan.",
    },
    {
      kind: "scenario", id: "a3-makebuy", chapter: 3, tag: "Make or Buy",
      situation: "Komponen bisa dibuat sendiri dengan variable cost $12/unit, atau dibeli $14/unit. Kapasitas pabrik lagi nganggur dan fixed cost-nya tetap jalan apapun pilihannya. Lebih murah mana?",
      choices: [
        { text: "Buat sendiri ($12 < $14)", correct: true, feedback: "Betul. Fixed cost-nya tetap jalan (gak relevan), jadi bandingin variable $12 vs beli $14. Buat sendiri lebih hemat." },
        { text: "Beli aja $14", correct: false, feedback: "Lebih mahal $2/unit. Karena fixed cost tetap jalan, yang relevan cuma variable $12 vs harga beli $14." },
        { text: "Gak bisa ditentuin", correct: false, feedback: "Bisa: abaikan fixed yang tetap jalan, bandingin yang berubah. $12 < $14." },
      ],
      follow: {
        situation: "Ternyata kalau berhenti bikin sendiri, kapasitas nganggur itu bisa disewain $5.000. Ini ngubah keputusan?",
        choices: [
          { text: "Iya, sewa $5.000 jadi opportunity cost yang relevan", correct: true, feedback: "Pas. Pendapatan yang hilang (opportunity cost) ikut dihitung di incremental analysis." },
          { text: "Enggak ngaruh sama sekali", correct: false, feedback: "Ngaruh. Opportunity cost (pemasukan yang dilepas) itu relevan." },
        ],
      },
    },
    {
      kind: "explain", id: "a3-budget", chapter: 3, icon: "ClipboardList",
      heading: "Master budget",
      body: "Master budget itu rangkaian budget yang nyambung. Semuanya mulai dari budget penjualan, karena produksi, bahan, dan tenaga kerja semua ngikutin perkiraan penjualan.",
    },
    {
      kind: "order", id: "a3-budget-order", chapter: 3,
      prompt: "Urutkan penyusunan master budget:",
      steps: [
        "Sales budget (perkiraan penjualan)",
        "Production budget (mau produksi berapa)",
        "Direct materials budget (butuh bahan berapa)",
        "Budgeted income statement",
        "Cash budget",
      ],
      explain: "Semua ngalir dari sales budget. Tau mau jual berapa -> produksi berapa -> bahan berapa -> baru bisa proyeksiin laba dan kas.",
    },
    {
      kind: "explain", id: "a3-flex", chapter: 3, icon: "Gauge",
      heading: "Static vs Flexible budget",
      body: "Static budget dibuat buat satu tingkat kegiatan aja. Flexible budget nyesuain ke kegiatan yang beneran terjadi, jadi perbandingannya lebih adil pas ngevaluasi kinerja.",
    },
    {
      kind: "multi", id: "a3-roi", chapter: 3,
      question: "Soal ROI (Return on Investment) di investment center, mana yang benar? Pilih semua.",
      options: [
        "ROI = Controllable margin / Average operating assets",
        "ROI naik kalau bisa naikin margin tanpa nambah aset",
        "ROI selalu lebih bagus daripada residual income dalam segala kasus",
        "ROI dipakai buat nilai kinerja investment center",
      ],
      answers: [0, 1, 3],
      explain: "ROI = margin dibagi aset, naik kalau margin naik atau aset lebih efisien, dan dipakai buat investment center. Tapi ROI gak selalu unggul dari residual income.",
    },
    {
      kind: "swipe", id: "a3-swipe", chapter: 3, prompt: "Bener atau salah?",
      statements: [
        { text: "Sunk cost diabaikan dalam incremental analysis.", isTrue: true },
        { text: "Master budget mulai dari cash budget.", isTrue: false, note: "Mulainya dari sales budget, bukan cash budget." },
        { text: "Flexible budget nyesuain ke tingkat kegiatan aktual.", isTrue: true },
      ],
    },
    {
      kind: "checkpoint", id: "a3-cp", chapter: 3, title: "Checkpoint Bab 3",
      question: "Benang merah keputusan & kontrol:",
      options: [
        "Fokus ke biaya yang berubah (relevan), rencanakan lewat budget berurutan, lalu ukur kinerja",
        "Selalu produksi sendiri, jangan pernah beli dari luar",
        "Sunk cost selalu dihitung dalam tiap keputusan",
      ],
      answer: 0,
      explain: "Tepat. Keputusan pakai biaya relevan (bukan sunk cost), perencanaan lewat master budget, kontrol lewat flexible budget & ROI.",
    },
  ],
};
