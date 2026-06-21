import type { ExamData } from "@/types/exam";

/**
 * Accounting for Business — Latihan Soal Prediksi UAS
 *
 * Converted verbatim from:
 *   "Accounting for Business - Latihan Soal Prediksi UAS.pdf" (haistudy)
 *
 * IMPORTANT: Content must NOT be modified. All questions, answers, and rubrics
 * are exact transcriptions from the PDF. Bilingual (EN/ID) for questions,
 * Bahasa Indonesia only for answer keys and rubrics (matching the PDF).
 *
 * Multi-part essays are split into one answer box per sub-part (a/b/c); the
 * PDF's part-labeled rubric is split accordingly (faithful, no invention).
 *
 * Rendering: question/answer text supports Markdown (GFM tables) + KaTeX. Money
 * like `$40,000` stays literal text (single-dollar math is disabled in
 * ExamMarkdown); use `$$...$$` only for true display formulas.
 */
export const akuntansiExam: ExamData = {
  meta: {
    subjectId: "akuntansi",
    examId: "akuntansi-uas-pred-v1",
    title: {
      en: "UAS Prediction Practice Exam",
      id: "Latihan Soal Prediksi UAS",
    },
    academicYear: "2025 / 2026",
    semester: "Even Semester (Genap)",
    examType: "Onsite, Theory",
    program: "Undergraduate Program, Business Management",
    courseName: "Accounting for Business",
    date: "Monday, 29 June 2026",
    time: "15:00 - 17:00 WIB",
    durationMinutes: 120,
    totalScore: 100,
    formatDescription: {
      en: "Essay 40% (Type I) + Case Study 60% (Type II)",
      id: "Esai 40% (Type I) + Studi Kasus 60% (Type II)",
    },
    instructions: {
      en: "Answer all questions. There are two parts: Type I (Essay, 4 questions, 40 points) and Type II (Case Study, 2 cases, 60 points). For essay questions, answer using the theory from the material and show calculations where asked. For case studies, show your complete calculation steps. You may answer in Indonesian or English.",
      id: "Kerjakan semua soal. Ada dua bagian: Type I (Esai, 4 soal, 40 poin) dan Type II (Studi Kasus, 2 kasus, 60 poin). Untuk soal esai, jawab memakai teori dari materi dan tunjukkan perhitungan bila diminta. Untuk studi kasus, tunjukkan langkah perhitungan lengkap. Boleh dijawab dalam Bahasa Indonesia atau Inggris.",
    },
    banner: {
      en: "This document is a practice and prediction exam simulation, not an official BINUS exam paper. It is built from the course summaries to illustrate the likely form of the exam.",
      id: "Dokumen ini adalah latihan dan simulasi soal prediksi UAS, bukan naskah ujian resmi BINUS. Soal disusun dari rangkuman materi sebagai gambaran kemungkinan bentuk soal ujian. Gunakan sebagai bahan latihan, bukan bocoran.",
    },
  },

  questions: [
    // ═══════════════════════════════════════════════
    // TYPE I. ESSAY (40 points) — split into sub-boxes
    // ═══════════════════════════════════════════════
    {
      id: "soal-1",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (4 questions x 10 = 40 points)",
        id: "TYPE I. SOAL ESAI (4 soal x 10 poin = 40 poin)",
      },
      points: 10,
      title: {
        en: "Question 1 (Managerial Accounting)",
        id: "Soal 1 (Managerial Accounting)",
      },
      subQuestions: [
        {
          id: "soal-1a",
          points: 3,
          question: {
            en: "Explain at least three differences between financial accounting and managerial accounting. (3 points)",
            id: "Jelaskan minimal tiga perbedaan antara financial accounting dan managerial accounting. (3 poin)",
          },
        },
        {
          id: "soal-1b",
          points: 7,
          question: {
            en: `Tony Furniture makes wooden desks. The monthly costs are listed below. Classify each cost as a product cost (direct materials, direct labor, or manufacturing overhead) or a period cost, then compute the total product cost and the total period cost. (7 points)

| Cost item | Amount |
|---|---|
| Wood used for the desks | $40,000 |
| Wages of assembly workers | 25,000 |
| Depreciation of factory machinery | 8,000 |
| Factory utilities | 3,000 |
| Salary of the factory manager | 6,000 |
| Advertising | 5,000 |
| Sales commissions | 4,000 |
| Office administrative staff salary | 7,000 |`,
            id: `Tony Furniture membuat meja kayu. Biaya bulanannya tertera pada tabel di bawah. Klasifikasikan tiap biaya sebagai product cost (direct materials, direct labor, atau manufacturing overhead) atau period cost, lalu hitung total product cost dan total period cost. (7 poin)

| Biaya | Jumlah |
|---|---|
| Kayu untuk meja | $40.000 |
| Upah perakit | 25.000 |
| Penyusutan mesin pabrik | 8.000 |
| Factory utilities | 3.000 |
| Gaji manajer pabrik | 6.000 |
| Iklan | 5.000 |
| Komisi penjualan | 4.000 |
| Gaji staf administrasi kantor | 7.000 |`,
          },
        },
      ],
    },
    {
      id: "soal-2",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (4 questions x 10 = 40 points)",
        id: "TYPE I. SOAL ESAI (4 soal x 10 poin = 40 poin)",
      },
      points: 10,
      title: {
        en: "Question 2 (Incremental Analysis)",
        id: "Soal 2 (Incremental Analysis)",
      },
      subQuestions: [
        {
          id: "soal-2a",
          points: 3,
          question: {
            en: "Explain the meaning of relevant cost, opportunity cost, and sunk cost. (3 points)",
            id: "Jelaskan arti relevant cost, opportunity cost, dan sunk cost. (3 poin)",
          },
        },
        {
          id: "soal-2b",
          points: 7,
          question: {
            en: "A company makes 10,000 units of a part with these annual costs: direct materials $20,000, direct labor $30,000, variable manufacturing overhead $15,000, and fixed manufacturing overhead $25,000. An outside supplier offers the part at $8.00 per unit. If the company buys, all variable costs are eliminated and $8,000 of the fixed overhead is avoided; the rest of the fixed cost continues. (i) Without other uses for the facilities, should the company make or buy? (ii) If the freed facilities could earn $14,000 of additional contribution margin, should it make or buy? Show your analysis. (7 points)",
            id: "Sebuah perusahaan membuat 10.000 unit komponen dengan biaya tahunan: direct materials $20.000, direct labor $30.000, variable manufacturing overhead $15.000, dan fixed manufacturing overhead $25.000. Pemasok luar menawarkan komponen seharga $8,00 per unit. Jika membeli, semua variable cost hilang dan $8.000 fixed overhead bisa dihindari; sisa fixed cost tetap ada. (i) Tanpa pemakaian lain atas fasilitas, sebaiknya make atau buy? (ii) Jika fasilitas yang terbebas bisa menghasilkan tambahan contribution margin $14.000, sebaiknya make atau buy? Tunjukkan analisisnya. (7 poin)",
          },
        },
      ],
    },
    {
      id: "soal-3",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (4 questions x 10 = 40 points)",
        id: "TYPE I. SOAL ESAI (4 soal x 10 poin = 40 poin)",
      },
      points: 10,
      title: {
        en: "Question 3 (Responsibility Accounting)",
        id: "Soal 3 (Responsibility Accounting)",
      },
      subQuestions: [
        {
          id: "soal-3a",
          points: 3,
          question: {
            en: "Explain the three types of responsibility center and the basis used to evaluate the manager of each. (3 points)",
            id: "Jelaskan tiga jenis responsibility center dan dasar yang dipakai untuk menilai manajer tiap pusat. (3 poin)",
          },
        },
        {
          id: "soal-3b",
          points: 4,
          question: {
            en: "The South Division reports a contribution margin of $400,000, controllable fixed costs of $160,000, average operating assets of $1,200,000, and a minimum rate of return of 10%. Compute the controllable margin, the return on investment (ROI), and the residual income. (4 points)",
            id: "South Division melaporkan contribution margin $400.000, controllable fixed costs $160.000, average operating assets $1.200.000, dan minimum rate of return 10%. Hitung controllable margin, return on investment (ROI), dan residual income. (4 poin)",
          },
        },
        {
          id: "soal-3c",
          points: 3,
          question: {
            en: "State and explain the two ways a manager can improve the division ROI. (3 points)",
            id: "Sebutkan dan jelaskan dua cara manajer memperbaiki ROI divisi. (3 poin)",
          },
        },
      ],
    },
    {
      id: "soal-4",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (4 questions x 10 = 40 points)",
        id: "TYPE I. SOAL ESAI (4 soal x 10 poin = 40 poin)",
      },
      points: 10,
      title: {
        en: "Question 4 (Budgetary Control)",
        id: "Soal 4 (Budgetary Control)",
      },
      subQuestions: [
        {
          id: "soal-4a",
          points: 3,
          question: {
            en: "Explain the difference between a static budget and a flexible budget, and explain what a budget variance is. (3 points)",
            id: "Jelaskan perbedaan static budget dan flexible budget, serta jelaskan apa itu budget variance. (3 poin)",
          },
        },
        {
          id: "soal-4b",
          points: 4,
          question: {
            en: "At an activity level of 10,000 direct labor hours, the Assembly Department total budgeted cost is $70,000. The variable cost is $4 per direct labor hour. Determine the total fixed cost, write the flexible budget cost equation, and compute the total budgeted cost at 12,000 direct labor hours. (4 points)",
            id: "Pada tingkat 10.000 direct labor hour, total budgeted cost Assembly Department adalah $70.000. Variable cost $4 per direct labor hour. Tentukan total fixed cost, tulis cost equation flexible budget, dan hitung total budgeted cost pada 12.000 direct labor hour. (4 poin)",
          },
        },
        {
          id: "soal-4c",
          points: 3,
          question: {
            en: "Explain the difference between controllable cost and noncontrollable cost. (3 points)",
            id: "Jelaskan perbedaan controllable cost dan noncontrollable cost. (3 poin)",
          },
        },
      ],
    },

    // ═══════════════════════════════════════════════
    // TYPE II. CASE STUDY (60 points)
    // ═══════════════════════════════════════════════
    {
      id: "kasus-1",
      type: "case-study",
      sectionLabel: {
        en: "TYPE II. CASE STUDY (2 cases x 30 = 60 points)",
        id: "TYPE II. STUDI KASUS (2 kasus x 30 poin = 60 poin)",
      },
      points: 30,
      title: {
        en: "Case 1: Cost-Volume-Profit Analysis",
        id: "Kasus 1: Cost-Volume-Profit Analysis",
      },
      context: {
        en: "PT Sinar Audio manufactures a single product, a portable speaker called SoundWave. Use the data in each part below.",
        id: "PT Sinar Audio memproduksi satu jenis produk, yaitu speaker portabel bernama SoundWave. Gunakan data pada tiap bagian di bawah.",
      },
      subQuestions: [
        {
          id: "kasus-1a",
          points: 10,
          question: {
            en: `(a) High-Low Method. During the past year the company recorded the following data for its maintenance cost, which is a mixed cost:

| Activity level | Units produced | Total maintenance cost |
|---|---|---|
| Highest | 12,000 | $46,000 |
| Lowest | 6,000 | $28,000 |

Using the high-low method: (i) compute the variable cost per unit; (ii) compute the total fixed cost; (iii) write the cost equation; (iv) estimate the total maintenance cost at an activity level of 9,000 units.`,
            id: `(a) High-Low Method. Selama tahun lalu perusahaan mencatat data biaya maintenance berikut (mixed cost):

| Tingkat aktivitas | Unit diproduksi | Total biaya maintenance |
|---|---|---|
| Tertinggi | 12.000 | $46.000 |
| Terendah | 6.000 | $28.000 |

Dengan high-low method: (i) hitung variable cost per unit; (ii) hitung total fixed cost; (iii) tulis cost equation; (iv) perkirakan total biaya maintenance pada 9.000 unit.`,
          },
        },
        {
          id: "kasus-1b",
          points: 10,
          question: {
            en: "(b) Contribution Margin and Break-Even. For the SoundWave, the unit selling price is $80, the unit variable cost is $48, and total fixed costs are $480,000 per year. Compute: (i) the unit contribution margin; (ii) the contribution margin ratio; (iii) the break-even point in units; (iv) the break-even point in sales dollars.",
            id: "(b) Contribution Margin dan Break-Even. Untuk SoundWave, unit selling price $80, unit variable cost $48, dan total fixed costs $480.000 per tahun. Hitung: (i) unit contribution margin; (ii) contribution margin ratio; (iii) break-even point dalam unit; (iv) break-even point dalam sales dollars.",
          },
        },
        {
          id: "kasus-1c",
          points: 10,
          question: {
            en: "(c) Target Net Income and Margin of Safety. (i) Management sets a target net income of $240,000. Compute the required sales in units and in sales dollars. (ii) If the expected actual sales are 20,000 units, compute the margin of safety in dollars and the margin of safety ratio. (iii) Briefly explain what the margin of safety ratio tells management.",
            id: "(c) Target Net Income dan Margin of Safety. (i) Manajemen menetapkan target net income $240.000. Hitung required sales dalam unit dan dalam sales dollars. (ii) Jika penjualan aktual yang diharapkan 20.000 unit, hitung margin of safety dalam dollar dan margin of safety ratio. (iii) Jelaskan singkat apa arti margin of safety ratio bagi manajemen.",
          },
        },
      ],
    },
    {
      id: "kasus-2",
      type: "case-study",
      sectionLabel: {
        en: "TYPE II. CASE STUDY (2 cases x 30 = 60 points)",
        id: "TYPE II. STUDI KASUS (2 kasus x 30 poin = 60 poin)",
      },
      points: 30,
      title: {
        en: "Case 2: Master Budget and Cash Budget",
        id: "Kasus 2: Master Budget and Cash Budget",
      },
      context: {
        en: `PT Boga Niaga is a merchandising company (a retailer). It is preparing budgets for the fourth quarter (October, November, December). Use the data below for all parts.

**Data:**
- Budgeted sales: October $400,000, November $500,000, December $600,000. January next year $700,000.
- Cash collections: 70% in the month of sale, 30% in the month after. Accounts receivable on October 1 is $120,000, all collected in October.
- Cost of goods sold is 60% of sales. Desired ending inventory each month is 25% of next month cost of goods sold. Inventory on October 1 is $60,000.
- Purchases are paid 60% in the month of purchase and 40% in the month after. Accounts payable on October 1 is $97,000, all paid in October.
- Selling and administrative cash expenses: October $80,000, November $90,000, December $100,000 (paid in the month incurred). Equipment costing $220,000 is bought and paid for in October.
- The company keeps a minimum cash balance of $50,000. The cash balance on October 1 is $50,000. It borrows at the end of any month with a shortage and repays as soon as cash allows. Ignore interest.`,
        id: `PT Boga Niaga adalah perusahaan dagang (peritel). Perusahaan menyusun budget untuk kuartal keempat (Oktober, November, Desember). Gunakan data berikut untuk semua bagian.

**Data:**
- Budgeted sales: Oktober $400.000, November $500.000, Desember $600.000. Januari tahun depan $700.000.
- Cash collections: 70% di bulan penjualan, 30% di bulan berikutnya. Accounts receivable per 1 Oktober adalah $120.000, semuanya tertagih di Oktober.
- Cost of goods sold 60% dari sales. Desired ending inventory tiap bulan 25% dari cost of goods sold bulan berikutnya. Inventory per 1 Oktober $60.000.
- Pembelian dibayar 60% di bulan pembelian dan 40% di bulan berikutnya. Accounts payable per 1 Oktober $97.000, semuanya dibayar di Oktober.
- Selling and administrative cash expenses: Oktober $80.000, November $90.000, Desember $100.000 (dibayar di bulan terjadinya). Peralatan seharga $220.000 dibeli dan dibayar di Oktober.
- Perusahaan menjaga saldo kas minimum $50.000. Saldo kas per 1 Oktober $50.000. Perusahaan meminjam di akhir bulan yang mengalami kekurangan dan melunasi segera setelah kas memungkinkan. Abaikan bunga.`,
      },
      subQuestions: [
        {
          id: "kasus-2a",
          points: 10,
          question: {
            en: "(a) Sales Budget and Schedule of Cash Receipts. Prepare the schedule of expected cash receipts for October, November, and December, and compute the accounts receivable balance at December 31.",
            id: "(a) Sales Budget dan Schedule of Cash Receipts. Susun schedule of expected cash receipts untuk Oktober, November, dan Desember, lalu hitung saldo accounts receivable pada 31 Desember.",
          },
        },
        {
          id: "kasus-2b",
          points: 10,
          question: {
            en: "(b) Inventory Purchases Budget and Cash Payments. Prepare the inventory purchases budget (required purchases) for each month, then prepare the schedule of cash payments for purchases for October, November, and December.",
            id: "(b) Inventory Purchases Budget dan Cash Payments. Susun inventory purchases budget (required purchases) tiap bulan, lalu susun schedule of cash payments for purchases untuk Oktober, November, dan Desember.",
          },
        },
        {
          id: "kasus-2c",
          points: 10,
          question: {
            en: "(c) Cash Budget with Financing. Prepare the cash budget for October, November, and December. Show beginning cash, cash receipts, cash available, total disbursements, the excess or deficiency before financing, the borrowing or repayment, and the ending cash balance for each month.",
            id: "(c) Cash Budget with Financing. Susun cash budget untuk Oktober, November, dan Desember. Tunjukkan beginning cash, cash receipts, cash available, total disbursements, kelebihan atau kekurangan sebelum financing, jumlah pinjaman atau pelunasan, dan ending cash balance tiap bulan.",
          },
        },
      ],
    },
  ],

  // ═══════════════════════════════════════════════
  // ANSWER KEYS & RUBRICS (Bahasa Indonesia only)
  // ═══════════════════════════════════════════════
  answerKeys: [
    {
      questionId: "soal-1a",
      maxPoints: 3,
      referenceAnswer:
        "Tiga perbedaan (pilih tiga): pemakai utama (financial untuk pihak luar seperti pemegang saham, kreditor, regulator; managerial untuk pihak dalam yaitu manajer); jenis laporan (financial berupa laporan keuangan resmi yang umum dan terbit tiap kuartal serta tahunan; managerial berupa laporan internal khusus sesering dibutuhkan); standar (financial mengikuti GAAP dan diaudit CPA; managerial tidak terikat GAAP dan tanpa audit independen); tingkat kerincian (financial mencakup perusahaan secara keseluruhan; managerial sangat rinci sampai bagian kecil perusahaan).",
      rubric: "1 poin per perbedaan benar, maksimal 3 poin.",
    },
    {
      questionId: "soal-1b",
      maxPoints: 7,
      referenceAnswer: `Klasifikasi dan perhitungan:

| Biaya | Jumlah | Klasifikasi |
|---|---|---|
| Kayu untuk meja | $40,000 | Direct materials (product) |
| Upah perakit | 25,000 | Direct labor (product) |
| Penyusutan mesin pabrik | 8,000 | Manufacturing overhead (product) |
| Factory utilities | 3,000 | Manufacturing overhead (product) |
| Gaji manajer pabrik | 6,000 | Manufacturing overhead (product) |
| Iklan | 5,000 | Period cost |
| Komisi penjualan | 4,000 | Period cost |
| Gaji staf administrasi kantor | 7,000 | Period cost |

Total product cost = 40,000 + 25,000 + 8,000 + 3,000 + 6,000 = $82,000.
Total period cost = 5,000 + 4,000 + 7,000 = $16,000.`,
      rubric:
        "Klasifikasi delapan biaya 0,5 poin per item (maksimal 4); total product cost $82.000 sebesar 1,5; total period cost $16.000 sebesar 1,5 (total 7 poin).",
    },
    {
      questionId: "soal-2a",
      maxPoints: 3,
      referenceAnswer:
        "Relevant cost: biaya yang berbeda antar-pilihan dan ikut menentukan keputusan. Opportunity cost: potensi manfaat yang hilang karena memilih satu tindakan dan melepas tindakan lain. Sunk cost: biaya yang sudah terjadi dan tidak bisa diubah oleh keputusan sekarang maupun nanti, sehingga tidak relevan.",
      rubric: "Relevant 1; opportunity 1; sunk 1 (total 3 poin).",
    },
    {
      questionId: "soal-2b",
      maxPoints: 7,
      referenceAnswer: `Analisis make or buy:

| | Make | Buy |
|---|---|---|
| Direct materials | $20,000 | $0 |
| Direct labor | 30,000 | 0 |
| Variable manufacturing overhead | 15,000 | 0 |
| Fixed manufacturing overhead | 25,000 | 17,000 |
| Purchase price (10,000 x $8) | 0 | 80,000 |
| Total cost | $90,000 | $97,000 |

(i) Tanpa pemakaian lain, membuat lebih murah $7.000, jadi sebaiknya make.

(ii) Dengan opportunity cost $14.000 yang ditambahkan ke kolom Make: Make = $90,000 + $14,000 = $104,000 vs Buy = $97,000. Sekarang membeli lebih murah $7.000, jadi sebaiknya buy; net income naik $7.000.`,
      rubric:
        "Total Make $90.000 sebesar 1,5; total Buy $97.000 sebesar 1,5; keputusan make (i) 1; opportunity cost masuk dan keputusan buy (ii) 2 (total 6, dibulatkan dalam 7 poin bagian b).",
    },
    {
      questionId: "soal-3a",
      maxPoints: 3,
      referenceAnswer:
        "Cost center: menanggung biaya tetapi tidak langsung menghasilkan pendapatan, manajernya dinilai dari kemampuan mengendalikan biaya. Profit center: menanggung biaya dan menghasilkan pendapatan, manajernya dinilai dari profitabilitas. Investment center: menanggung biaya, menghasilkan pendapatan, dan punya dana investasi, manajernya dinilai dari profitabilitas dan rate of return (ROI).",
      rubric: "1 poin per center (total 3 poin).",
    },
    {
      questionId: "soal-3b",
      maxPoints: 4,
      referenceAnswer: `Perhitungan:

Controllable margin = $400,000 - $160,000 = $240,000

ROI = $240,000 / $1,200,000 = 20%

Residual income = $240,000 - (10% x $1,200,000) = $240,000 - $120,000 = $120,000`,
      rubric:
        "Controllable margin 1; ROI 1,5; residual income 1,5 (total 4 poin).",
    },
    {
      questionId: "soal-3c",
      maxPoints: 3,
      referenceAnswer:
        "Dua cara memperbaiki ROI: menaikkan controllable margin (misalnya menaikkan penjualan atau menekan biaya yang controllable), atau menurunkan average operating assets (memakai aset lebih efisien).",
      rubric: "1,5 poin per cara (total 3 poin).",
    },
    {
      questionId: "soal-4a",
      maxPoints: 3,
      referenceAnswer:
        "Static budget: proyeksi data budget pada satu tingkat kegiatan saja. Flexible budget: proyeksi data budget untuk berbagai tingkat kegiatan, sehingga bisa disesuaikan dengan tingkat kegiatan aktual. Budget variance: selisih antara hasil aktual dan data budget.",
      rubric: "Static 1; flexible 1; budget variance 1 (total 3 poin).",
    },
    {
      questionId: "soal-4b",
      maxPoints: 4,
      referenceAnswer: `Perhitungan flexible budget:

Total fixed cost = $70,000 - ($4 x 10,000) = $70,000 - $40,000 = $30,000

Cost equation: Total budgeted cost = $30,000 + ($4 x DLH)

Pada 12,000 DLH = $30,000 + ($4 x 12,000) = $30,000 + $48,000 = $78,000`,
      rubric:
        "Fixed cost 1,5; cost equation 1; nilai pada 12.000 DLH 1,5 (total 4 poin).",
    },
    {
      questionId: "soal-4c",
      maxPoints: 3,
      referenceAnswer:
        "Controllable cost: biaya yang bisa dikendalikan seorang manajer pada tingkatnya. Noncontrollable cost: biaya yang terjadi tidak langsung lalu dialokasikan ke suatu tingkat dan tidak bisa dikendalikan manajer itu.",
      rubric: "Controllable 1,5; noncontrollable 1,5 (total 3 poin).",
    },
    {
      questionId: "kasus-1a",
      maxPoints: 10,
      referenceAnswer: `High-Low Method:

Variable cost per unit = ($46,000 - $28,000) / (12,000 - 6,000) = $18,000 / 6,000 = $3 per unit

Total fixed cost = $46,000 - ($3 x 12,000) = $10,000

Cost equation: Total maintenance cost = $10,000 + ($3 x units)

Pada 9,000 unit = $10,000 + ($3 x 9,000) = $37,000`,
      rubric:
        "Variable cost per unit 3; total fixed cost 3; cost equation 2; estimasi 9.000 unit 2. Total 10 poin.",
    },
    {
      questionId: "kasus-1b",
      maxPoints: 10,
      referenceAnswer: `Contribution Margin dan Break-Even:

Unit contribution margin = $80 - $48 = $32

Contribution margin ratio = $32 / $80 = 40%

Break-even in units = $480,000 / $32 = 15,000 unit

Break-even in dollars = $480,000 / 0,40 = $1,200,000`,
      rubric:
        "Unit CM 2; CM ratio 2; break-even units 3; break-even dollars 3. Total 10 poin.",
    },
    {
      questionId: "kasus-1c",
      maxPoints: 10,
      referenceAnswer: `Target Net Income dan Margin of Safety:

Required sales (unit) = ($480,000 + $240,000) / $32 = 22,500 unit

Required sales (dollar) = $720,000 / 0,40 = $1,800,000

Expected sales = 20,000 x $80 = $1,600,000

Margin of safety (dollar) = $1,600,000 - $1,200,000 = $400,000

Margin of safety ratio = $400,000 / $1,600,000 = 25%

Arti: penjualan masih boleh turun sampai 25% dari tingkat yang diharapkan sebelum perusahaan mulai rugi. Makin besar rasio ini, makin aman.`,
      rubric:
        "Required sales unit 3; required sales dollar 2; margin of safety dollar 2; margin of safety ratio 2; penjelasan 1. Total 10 poin.",
    },
    {
      questionId: "kasus-2a",
      maxPoints: 10,
      referenceAnswer: `Schedule of Cash Receipts:

| | October | November | December | Total |
|---|---|---|---|---|
| Collection from beginning A/R | $120,000 | | | $120,000 |
| 70% of current month sales | 280,000 | $350,000 | $420,000 | 1,050,000 |
| 30% of prior month sales | 0 | 120,000 | 150,000 | 270,000 |
| Total cash receipts | $400,000 | $470,000 | $570,000 | $1,440,000 |

Accounts receivable, 31 December = 30% x $600,000 = $180,000.`,
      rubric:
        "Penerimaan tiap bulan benar (Oct $400.000, Nov $470.000, Dec $570.000) 2 poin per bulan (total 6); pola 70%/30% dan A/R awal 2; saldo A/R akhir $180.000 sebesar 2. Total 10 poin.",
    },
    {
      questionId: "kasus-2b",
      maxPoints: 10,
      referenceAnswer: `Cost of goods sold = 60% dari sales. Desired ending inventory = 25% dari cost of goods sold bulan berikutnya.

| | October | November | December |
|---|---|---|---|
| Budgeted cost of goods sold | $240,000 | $300,000 | $360,000 |
| Plus: desired ending inventory | 75,000 | 90,000 | 105,000 |
| Inventory needed | 315,000 | 390,000 | 465,000 |
| Less: beginning inventory | 60,000 | 75,000 | 90,000 |
| Required purchases | $255,000 | $315,000 | $375,000 |

Catatan: ending inventory Desember = 25% x (COGS Januari $420,000) = $105,000.

| Schedule of cash payments | October | November | December | Total |
|---|---|---|---|---|
| Payment of beginning A/P | $97,000 | | | $97,000 |
| 60% of current month purchases | 153,000 | $189,000 | $225,000 | 567,000 |
| 40% of prior month purchases | 0 | 102,000 | 126,000 | 228,000 |
| Total cash payments | $250,000 | $291,000 | $351,000 | $892,000 |`,
      rubric:
        "Required purchases tiap bulan benar (Oct $255.000, Nov $315.000, Dec $375.000) 1,5 per bulan (total 4,5); pembayaran tiap bulan benar (Oct $250.000, Nov $291.000, Dec $351.000) 1,5 per bulan (total 4,5); rumus dan A/P awal 1. Total 10 poin.",
    },
    {
      questionId: "kasus-2c",
      maxPoints: 10,
      referenceAnswer: `Cash Budget:

| | October | November | December |
|---|---|---|---|
| Beginning cash balance | $50,000 | $50,000 | $50,000 |
| Add: cash receipts | 400,000 | 470,000 | 570,000 |
| Cash available | 450,000 | 520,000 | 620,000 |
| Less disbursements: | | | |
| Payment for purchases | 250,000 | 291,000 | 351,000 |
| Selling and admin. expenses | 80,000 | 90,000 | 100,000 |
| Purchase of equipment | 220,000 | 0 | 0 |
| Total disbursements | 550,000 | 381,000 | 451,000 |
| Excess (deficiency) before financing | (100,000) | 139,000 | 169,000 |
| Financing: borrowing (repayment) | 150,000 | (89,000) | (61,000) |
| Ending cash balance | $50,000 | $50,000 | $108,000 |

Penjelasan: pada Oktober kas kurang $100.000 dari saldo minimum $50.000, sehingga perlu meminjam $150.000 agar saldo akhir tepat $50.000. Pada November dan Desember ada kelebihan kas, sehingga pinjaman dilunasi sebanyak mungkin sambil menjaga saldo minimum, yaitu $89.000 di November dan $61.000 di Desember, sehingga pinjaman lunas pada akhir Desember.`,
      rubric:
        "Cash available tiap bulan 1 (total 3); total disbursements tiap bulan 1 (total 3); excess/deficiency dan financing benar (borrow $150.000, repay $89.000 dan $61.000) 2; ending cash tiap bulan benar 2. Total 10 poin.",
    },
  ],

  calculator: true,
};
