import type { ExamData } from "@/types/exam";
import { opsmgmtCheatSheet } from "./opsmgmt-cheatsheet";

/**
 * Operations Management — Latihan Soal Prediksi UAS
 *
 * Converted verbatim from:
 *   "Operations Management - Latihan Soal Prediksi UAS.pdf" (haistudy)
 *
 * IMPORTANT: Content must NOT be modified. All questions, answers, and rubrics
 * are exact transcriptions from the PDF. Bilingual (EN/ID) for questions,
 * Bahasa Indonesia only for answer keys and rubrics (matching the PDF).
 *
 * Multi-part questions are split into one answer box per sub-part (a/b/c); the
 * PDF's part-labeled rubric is split accordingly (faithful, no invention).
 *
 * Rendering: Markdown (GFM tables) + KaTeX. NOTE: inside template literals,
 * LaTeX commands MUST be written with double backslashes (e.g. `\\frac`,
 * `\\sqrt`) so the emitted string contains a single backslash for KaTeX.
 * Currency is Rupiah (Rp), kept as plain text outside math.
 *
 * The Operations Management cheat sheet (5 sheets) is attached via `cheatSheet`
 * and surfaced inside the exam player as an allowed reference.
 */
export const opsmgmtExam: ExamData = {
  meta: {
    subjectId: "opsmgmt",
    examId: "opsmgmt-uas-pred-v1",
    title: {
      en: "UAS Prediction Practice Exam",
      id: "Latihan Soal Prediksi UAS",
    },
    academicYear: "2025 / 2026",
    semester: "Even (Genap)",
    examType: "Onsite, Theory",
    program: "Undergraduate Program, Business Management",
    courseName: "Operations Management",
    date: "Thursday, 2 July 2026",
    time: "08:00 - 09:40 WIB",
    durationMinutes: 100,
    totalScore: 100,
    formatDescription: {
      en: "Essay 40% (Type I) + Case Study 60% (Type II)",
      id: "Esai 40% (Type I) + Studi Kasus 60% (Type II)",
    },
    instructions: {
      en: "All questions must be answered. For case questions, show complete calculation steps. Allowed aids: handwritten notes (max 5 A4 sheets, double-sided, ink other than black), a calculator, and a ruler — the cheat sheet is available in this practice exam. Total score is 100.",
      id: "Semua soal wajib dijawab. Untuk soal kasus, tunjukkan langkah perhitungan secara lengkap. Alat bantu yang diizinkan: catatan tulis tangan (maksimal 5 lembar A4 bolak-balik, tinta selain warna hitam), kalkulator, dan penggaris — cheat sheet tersedia di latihan ini. Total skor 100.",
    },
    banner: {
      en: "This document is not an official BINUS exam paper. The questions are compiled from the course summaries as a prediction of the likely exam format, for self-study. Numbers, company names, and scenarios are fictional. Methods and formulas follow the course material.",
      id: "Dokumen ini bukan naskah ujian resmi BINUS. Soal disusun dari rangkuman materi sebagai gambaran prediksi bentuk soal ujian, dan dipakai untuk latihan mandiri. Angka, nama perusahaan, dan skenario bersifat fiktif. Metode serta rumus mengikuti materi kuliah.",
    },
  },

  questions: [
    // ═══════════════════════════════════════════════
    // TYPE I. ESSAY (40 points)
    // ═══════════════════════════════════════════════
    {
      id: "soal-1",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (40 points)",
        id: "TYPE I. SOAL ESAI (40 poin)",
      },
      points: 20,
      title: {
        en: "Question 1. Inventory Management and Aggregate Planning",
        id: "Soal 1. Inventory Management dan Aggregate Planning",
      },
      context: {
        en: "A growing consumer goods company is reviewing two things: how it controls its inventory items and how it plans production over the medium term. Answer the following points.",
        id: "Sebuah perusahaan barang konsumsi yang sedang berkembang sedang meninjau dua hal: bagaimana mereka mengendalikan barang persediaan dan bagaimana mereka merencanakan produksi untuk jangka menengah. Jawab poin-poin berikut.",
      },
      subQuestions: [
        {
          id: "soal-1a",
          points: 10,
          question: {
            en: "(a) Explain the purpose of ABC analysis and how the three classes (A, B, and C) usually differ in number of items and in annual dollar volume. State at least two control policies that fit Class A items, then explain the difference between independent demand and dependent demand.",
            id: "(a) Jelaskan tujuan ABC analysis dan bagaimana ketiga kelas (A, B, dan C) biasanya berbeda dalam jumlah barang dan annual dollar volume. Sebutkan minimal dua kebijakan pengendalian yang cocok untuk barang Class A, lalu jelaskan perbedaan independent demand dan dependent demand.",
          },
        },
        {
          id: "soal-1b",
          points: 10,
          question: {
            en: "(b) Explain the difference between a chase strategy and a level strategy in aggregate planning. Describe two capacity options and two demand options a manager can use to balance demand and capacity, and explain what Sales and Operations Planning (S&OP) produces.",
            id: "(b) Jelaskan perbedaan chase strategy dan level strategy dalam aggregate planning. Uraikan dua capacity options dan dua demand options yang bisa dipakai manajer untuk menyeimbangkan permintaan dan kapasitas, serta jelaskan apa yang dihasilkan oleh Sales and Operations Planning (S&OP).",
          },
        },
      ],
    },
    {
      id: "soal-2",
      type: "essay",
      sectionLabel: {
        en: "TYPE I. ESSAY (40 points)",
        id: "TYPE I. SOAL ESAI (40 poin)",
      },
      points: 20,
      title: {
        en: "Question 2. Lean Operations, Maintenance, and Reliability",
        id: "Soal 2. Lean Operations, Maintenance, dan Reliability",
      },
      context: {
        en: "A factory wants to cut waste, keep its machines running, and lower the risk of sudden failure. Use the course concepts to answer.",
        id: "Sebuah pabrik ingin menekan pemborosan, menjaga mesinnya tetap berjalan, dan mengurangi risiko kerusakan mendadak. Pakai konsep dari materi untuk menjawab.",
      },
      subQuestions: [
        {
          id: "soal-2a",
          points: 7,
          question: {
            en: '(a) Lean. Explain what "waste" means from the customer\'s point of view and list Ohno\'s seven wastes. Then explain how lowering inventory levels exposes hidden problems, and the difference between a pull system and a push system.',
            id: '(a) Lean. Jelaskan apa arti "waste" dari sudut pandang pelanggan dan sebutkan tujuh waste menurut Ohno. Lalu jelaskan bagaimana menurunkan tingkat persediaan membuat masalah yang tersembunyi jadi terlihat, dan perbedaan pull system dengan push system.',
          },
        },
        {
          id: "soal-2b",
          points: 7,
          question: {
            en: "(b) Maintenance. Explain the difference between preventive, breakdown, and predictive maintenance. Explain what autonomous maintenance asks employees to do, and the idea of Total Productive Maintenance (TPM).",
            id: "(b) Maintenance. Jelaskan perbedaan preventive, breakdown, dan predictive maintenance. Jelaskan apa yang diminta dari karyawan dalam autonomous maintenance, dan gagasan Total Productive Maintenance (TPM).",
          },
        },
        {
          id: "soal-2c",
          points: 6,
          question: {
            en: "(c) Reliability. Define reliability and maintenance. Explain the concept of effective reliability and how predictive maintenance can raise it, and explain the role of redundancy.",
            id: "(c) Reliability. Definisikan reliability dan maintenance. Jelaskan konsep effective reliability dan bagaimana predictive maintenance bisa menaikkannya, serta jelaskan peran redundancy.",
          },
        },
      ],
    },

    // ═══════════════════════════════════════════════
    // TYPE II. CASE STUDY (60 points)
    // ═══════════════════════════════════════════════
    {
      id: "soal-3",
      type: "case-study",
      sectionLabel: {
        en: "TYPE II. CASE STUDY (60 points)",
        id: "TYPE II. SOAL KASUS (60 poin)",
      },
      points: 20,
      title: {
        en: "Question 3. Location Strategies",
        id: "Soal 3. Location Strategies",
      },
      context: {
        en: "_Show the formula, the steps, and the final answer._\n\nPT Segar Nusantara, a beverage producer, is choosing the location for a new bottling plant and its distribution center. Use the methods below.",
        id: "_Tunjukkan rumus, langkah, dan hasil akhir._\n\nPT Segar Nusantara, sebuah produsen minuman, sedang memilih lokasi untuk pabrik pembotolan baru dan pusat distribusinya. Pakai metode di bawah ini.",
      },
      subQuestions: [
        {
          id: "soal-3a",
          points: 7,
          question: {
            en: `(a) Factor-Rating Method. The company rates three candidate cities on five key success factors. Using the weights and scores in the table, compute the weighted total for each city and decide which city should be chosen.

| Factor | Weight | Bekasi | Semarang | Surabaya |
|---|---|---|---|---|
| Labor availability | 0.30 | 80 | 75 | 70 |
| Utility cost | 0.20 | 60 | 85 | 75 |
| Proximity to market | 0.25 | 90 | 70 | 80 |
| Transport infrastructure | 0.15 | 85 | 70 | 80 |
| Local tax incentive | 0.10 | 50 | 80 | 70 |`,
            id: `(a) Factor-Rating Method. Perusahaan menilai tiga kota kandidat pada lima key success factors. Dengan bobot dan nilai pada tabel, hitung total tertimbang tiap kota dan tentukan kota mana yang sebaiknya dipilih.

| Faktor | Bobot | Bekasi | Semarang | Surabaya |
|---|---|---|---|---|
| Ketersediaan tenaga kerja | 0,30 | 80 | 75 | 70 |
| Biaya utilitas | 0,20 | 60 | 85 | 75 |
| Kedekatan dengan pasar | 0,25 | 90 | 70 | 80 |
| Infrastruktur transportasi | 0,15 | 85 | 70 | 80 |
| Insentif pajak daerah | 0,10 | 50 | 80 | 70 |`,
          },
        },
        {
          id: "soal-3b",
          points: 7,
          question: {
            en: `(b) Locational Cost-Volume Analysis. Three site options have the fixed and variable costs below. Find the crossover (indifference) volumes between the sites, and determine the lowest-cost site if the expected production volume is 25,000 units per year.

$$TC = FC + (VC \\times V)$$

| Site | Fixed Cost / year (Rp) | Variable Cost / unit (Rp) |
|---|---|---|
| A | 200.000.000 | 35.000 |
| B | 400.000.000 | 25.000 |
| C | 700.000.000 | 15.000 |`,
            id: `(b) Locational Cost-Volume Analysis. Tiga pilihan lokasi punya fixed cost dan variable cost di bawah. Cari volume titik temu (crossover) antar lokasi, dan tentukan lokasi termurah jika volume produksi yang diperkirakan 25.000 unit per tahun.

$$TC = FC + (VC \\times V)$$

| Lokasi | Fixed Cost / tahun (Rp) | Variable Cost / unit (Rp) |
|---|---|---|
| A | 200.000.000 | 35.000 |
| B | 400.000.000 | 25.000 |
| C | 700.000.000 | 15.000 |`,
          },
        },
        {
          id: "soal-3c",
          points: 6,
          question: {
            en: `(c) Center-of-Gravity Method. The distribution center will serve four stores. Their grid coordinates and monthly shipment volumes are below. Compute the center-of-gravity coordinates.

$$C_x = \\frac{\\sum x_i Q_i}{\\sum Q_i}, \\quad C_y = \\frac{\\sum y_i Q_i}{\\sum Q_i}$$

| Store | Coordinate x | Coordinate y | Volume / month (Qi) |
|---|---|---|---|
| Store 1 | 20 | 50 | 1,200 |
| Store 2 | 60 | 90 | 800 |
| Store 3 | 100 | 40 | 1,000 |
| Store 4 | 80 | 70 | 1,500 |`,
            id: `(c) Center-of-Gravity Method. Pusat distribusi akan melayani empat toko. Koordinat grid dan jumlah kiriman per bulan ada di bawah. Hitung koordinat center-of-gravity.

$$C_x = \\frac{\\sum x_i Q_i}{\\sum Q_i}, \\quad C_y = \\frac{\\sum y_i Q_i}{\\sum Q_i}$$

| Toko | Koordinat x | Koordinat y | Volume / bulan (Qi) |
|---|---|---|---|
| Toko 1 | 20 | 50 | 1.200 |
| Toko 2 | 60 | 90 | 800 |
| Toko 3 | 100 | 40 | 1.000 |
| Toko 4 | 80 | 70 | 1.500 |`,
          },
        },
      ],
    },
    {
      id: "soal-4",
      type: "case-study",
      sectionLabel: {
        en: "TYPE II. CASE STUDY (60 points)",
        id: "TYPE II. SOAL KASUS (60 poin)",
      },
      points: 20,
      title: {
        en: "Question 4. Material Requirements Planning (MRP)",
        id: "Soal 4. Material Requirements Planning (MRP)",
      },
      context: {
        en: `Product P is assembled from the bill of material (BOM) below. Each P needs 2 units of A and 3 units of B. Each A needs 1 unit of C and 2 units of D. Each B needs 2 units of D.

| | P | A | B | C | D |
|---|---|---|---|---|---|
| On-hand inventory (unit) | 0 | 50 | 0 | 20 | 100 |
| Lead time (weeks) | 1 | 2 | 1 | 2 | 1 |`,
        id: `Produk P dirakit dari bill of material (BOM) berikut. Tiap P butuh 2 unit A dan 3 unit B. Tiap A butuh 1 unit C dan 2 unit D. Tiap B butuh 2 unit D.

| | P | A | B | C | D |
|---|---|---|---|---|---|
| On-hand inventory (unit) | 0 | 50 | 0 | 20 | 100 |
| Lead time (minggu) | 1 | 2 | 1 | 2 | 1 |`,
      },
      subQuestions: [
        {
          id: "soal-4a",
          points: 6,
          question: {
            en: "(a) For a customer order of 100 units of P, compute the gross requirements for components A, B, C, and D using BOM explosion (ignore on-hand inventory for this part only).",
            id: "(a) Untuk pesanan pelanggan 100 unit P, hitung gross requirements komponen A, B, C, dan D dengan BOM explosion (abaikan on-hand inventory khusus untuk bagian ini saja).",
          },
        },
        {
          id: "soal-4b",
          points: 8,
          question: {
            en: "(b) 100 units of P are required at the end of week 8. Using the on-hand inventory and lead times in the table, compute the net requirements and the planned order release (timing and quantity) for P, A, B, C, and D. Net requirements = Gross requirements − On-hand − Scheduled receipts. Note that D appears under two parents, so apply low-level coding.",
            id: "(b) Sebanyak 100 unit P dibutuhkan pada akhir minggu 8. Dengan on-hand inventory dan lead time di tabel, hitung net requirements dan planned order release (waktu dan jumlah) untuk P, A, B, C, dan D. Net requirements = Gross requirements − On-hand − Scheduled receipts. Perhatikan bahwa D muncul di dua induk, jadi terapkan low-level coding.",
          },
        },
        {
          id: "soal-4c",
          points: 6,
          question: {
            en: `(c) A purchased component has the net requirements over 8 weeks shown below. Setup (ordering) cost is Rp100.000 per order and holding cost is Rp1.000 per unit per week. Compare the total cost of Lot-for-Lot with Periodic Order Quantity (POQ). Which technique is cheaper? Interval POQ = EOQ ÷ average weekly demand, with $$EOQ = \\sqrt{\\frac{2DS}{H}}$$ using average weekly demand.

| Week | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Net requirements (unit) | 40 | 0 | 30 | 50 | 0 | 40 | 30 | 20 |`,
            id: `(c) Sebuah komponen beli punya net requirements selama 8 minggu di bawah. Setup (ordering) cost Rp100.000 per pesanan dan holding cost Rp1.000 per unit per minggu. Bandingkan total biaya Lot-for-Lot dengan Periodic Order Quantity (POQ). Teknik mana yang lebih murah? Interval POQ = EOQ ÷ rata-rata kebutuhan per minggu, dengan $$EOQ = \\sqrt{\\frac{2DS}{H}}$$ memakai permintaan rata-rata mingguan.

| Minggu | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Net requirements (unit) | 40 | 0 | 30 | 50 | 0 | 40 | 30 | 20 |`,
          },
        },
      ],
    },
    {
      id: "soal-5",
      type: "case-study",
      sectionLabel: {
        en: "TYPE II. CASE STUDY (60 points)",
        id: "TYPE II. SOAL KASUS (60 poin)",
      },
      points: 20,
      title: {
        en: "Question 5. Short-Term Scheduling",
        id: "Soal 5. Short-Term Scheduling",
      },
      subQuestions: [
        {
          id: "soal-5a",
          points: 8,
          question: {
            en: `(a) Sequencing Rules. Five jobs are waiting at one work center and all are available now. Their processing time and due date (in days) are below. Sequence the jobs by FCFS, SPT, and EDD. For each rule, compute the average completion time, utilization, average number of jobs in the system, and average lateness. State which rule gives the lowest average completion time and which gives the smallest maximum lateness.

| Job (arrival order) | A | B | C | D | E |
|---|---|---|---|---|---|
| Processing time (days) | 4 | 7 | 3 | 6 | 5 |
| Due date (days) | 7 | 16 | 8 | 17 | 15 |`,
            id: `(a) Sequencing Rules. Lima job menunggu di satu work center dan semuanya sudah siap sekarang. Processing time dan due date (dalam hari) ada di bawah. Urutkan job menurut FCFS, SPT, dan EDD. Untuk tiap aturan, hitung average completion time, utilization, average number of jobs in the system, dan average lateness. Sebutkan aturan mana yang memberi average completion time terendah dan mana yang memberi maximum lateness terkecil.

| Job (urut datang) | A | B | C | D | E |
|---|---|---|---|---|---|
| Processing time (hari) | 4 | 7 | 3 | 6 | 5 |
| Due date (hari) | 7 | 16 | 8 | 17 | 15 |`,
          },
        },
        {
          id: "soal-5b",
          points: 5,
          question: {
            en: `(b) Critical Ratio. Today is day 20. Four jobs have the due date and remaining work days below. Compute the critical ratio (CR) of each job, give the processing priority, and state which job is already behind schedule.

$$CR = \\frac{\\text{Due date} - \\text{Today}}{\\text{Remaining work time}}$$

| Job | X | Y | Z | W |
|---|---|---|---|---|
| Due date (days) | 28 | 24 | 30 | 22 |
| Remaining work time (days) | 5 | 6 | 8 | 2 |`,
            id: `(b) Critical Ratio. Hari ini hari ke-20. Empat job punya due date dan sisa hari kerja di bawah. Hitung critical ratio (CR) tiap job, beri urutan prioritas pengerjaan, dan sebutkan job mana yang sudah terlambat dari jadwal.

$$CR = \\frac{\\text{Due date} - \\text{hari ini}}{\\text{sisa waktu kerja}}$$

| Job | X | Y | Z | W |
|---|---|---|---|---|
| Due date (hari) | 28 | 24 | 30 | 22 |
| Sisa waktu kerja (hari) | 5 | 6 | 8 | 2 |`,
          },
        },
        {
          id: "soal-5c",
          points: 7,
          question: {
            en: `(c) Johnson's Rule. Five jobs must pass through two work centers in the order WC1 then WC2. The processing times (in hours) are below. Use Johnson's Rule to find the job sequence, then build the timeline and find the makespan (total time to finish all jobs).

| Job | J1 | J2 | J3 | J4 | J5 |
|---|---|---|---|---|---|
| WC1 (hours) | 6 | 2 | 9 | 5 | 4 |
| WC2 (hours) | 3 | 7 | 4 | 8 | 6 |`,
            id: `(c) Johnson's Rule. Lima job harus melewati dua work center dengan urutan WC1 lalu WC2. Waktu proses (dalam jam) ada di bawah. Pakai Johnson's Rule untuk menemukan urutan job, lalu susun timeline dan cari makespan (total waktu menyelesaikan semua job).

| Job | J1 | J2 | J3 | J4 | J5 |
|---|---|---|---|---|---|
| WC1 (jam) | 6 | 2 | 9 | 5 | 4 |
| WC2 (jam) | 3 | 7 | 4 | 8 | 6 |`,
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
      maxPoints: 10,
      referenceAnswer:
        "ABC analysis membagi persediaan menjadi tiga kelas berdasarkan annual dollar volume, yaitu jumlah unit per tahun dikali harga per unit. Tujuannya memusatkan perhatian dan sumber daya pengendalian pada sedikit barang yang nilainya besar, bukan menyebar rata ke semua barang. Pola umumnya: Class A jumlah barangnya sedikit (sekitar 20 persen dari jumlah barang) tetapi menyumbang porsi nilai uang paling besar (sekitar 72 persen). Class B sekitar 30 persen jumlah dan 23 persen nilai. Class C sekitar 50 persen jumlah tetapi hanya sekitar 5 persen nilai. Kebijakan untuk barang Class A antara lain: pembinaan pemasok yang lebih giat (supplier development), kontrol fisik stok yang lebih ketat, peramalan yang lebih hati-hati, dan perhitungan ulang catatan yang lebih sering (cycle counting lebih rapat). Cukup sebutkan minimal dua. Independent demand adalah permintaan suatu barang yang tidak bergantung pada permintaan barang lain, misalnya produk jadi yang dijual ke pasar. Dependent demand adalah permintaan yang bergantung pada permintaan barang lain, misalnya komponen yang kebutuhannya mengikuti jumlah produk akhir yang akan dibuat.",
      rubric:
        "Tujuan ABC 2; pola tiga kelas (jumlah dan nilai) 3; dua kebijakan Class A 2; perbedaan independent dan dependent demand 3.",
    },
    {
      questionId: "soal-1b",
      maxPoints: 10,
      referenceAnswer:
        "Chase strategy mencocokkan laju produksi dengan ramalan permintaan tiap periode, biasanya dengan mengubah jumlah pekerja (rekrut atau berhentikan) atau mengubah laju produksi. Strategi ini menekan persediaan tetapi menambah biaya dan gejolak tenaga kerja. Level strategy membuat laju produksi atau jumlah pekerja tetap seragam, lalu memakai persediaan, backorder, atau waktu menganggur sebagai penyangga. Produksi yang stabil cenderung menghasilkan kualitas dan produktivitas yang lebih baik. Capacity options (pilih dua): mengubah tingkat persediaan, mengubah jumlah tenaga kerja dengan rekrut atau PHK, mengubah laju produksi lewat lembur atau waktu menganggur, subkontrak, dan memakai pekerja paruh waktu. Demand options (pilih dua): memengaruhi permintaan lewat iklan, promosi, atau potongan harga; backordering saat permintaan tinggi; dan counterseasonal mixing, yaitu mencampur produk yang musim ramainya berbeda. S&OP (Sales and Operations Planning) menyelaraskan ramalan permintaan dengan berbagai bagian perusahaan dan rantai pasok melalui tim lintas fungsi. Hasil akhir S&OP adalah aggregate plan yang feasible, yang lalu dipecah menjadi master production schedule.",
      rubric:
        "Chase vs level 3; dua capacity options 2; dua demand options 2; fungsi dan hasil S&OP 3.",
    },
    {
      questionId: "soal-2a",
      maxPoints: 7,
      referenceAnswer:
        "Waste adalah segala sesuatu yang tidak menambah nilai dari sudut pandang pelanggan. Kegiatan seperti penyimpanan, inspeksi, penundaan, antrian, dan produk cacat tidak menambah nilai sehingga dianggap pemborosan penuh. Tujuh waste menurut Ohno: overproduction, queues (antrian), transportation, inventory, motion (gerakan), overprocessing (proses berlebih), dan defective products (produk cacat). Menurunkan tingkat persediaan diibaratkan menurunkan tinggi air di kolam sehingga batu-batu masalah yang tadinya tersembunyi muncul ke permukaan, misalnya process downtime, scrap, setup time yang lama, masalah kualitas, dan keterlambatan kirim. Dengan begitu masalah jadi terlihat dan bisa dibereskan satu per satu. Pull system menarik material hanya saat dibutuhkan oleh proses berikutnya, dalam lot kecil, sehingga persediaan kecil dan masalah cepat terlihat. Push system mendorong pesanan ke stasiun berikutnya tanpa memperhatikan apakah stasiun itu membutuhkannya, sehingga persediaan menumpuk.",
      rubric:
        "Arti waste 1,5; tujuh waste Ohno 2,5; analogi air dan batu 1,5; pull vs push 1,5.",
    },
    {
      questionId: "soal-2b",
      maxPoints: 7,
      referenceAnswer:
        "Preventive maintenance adalah memantau peralatan serta melakukan inspeksi dan servis rutin agar tetap andal dan kerusakan dicegah sebelum terjadi. Breakdown maintenance adalah perbaikan darurat yang baru dilakukan setelah peralatan rusak. Predictive maintenance memakai teknologi pemantauan (misalnya analisis getaran, inframerah, dan analisis oli) untuk memperkirakan kapan kerusakan akan terjadi sehingga perawatan bisa dijadwalkan lebih awal. Autonomous maintenance berarti operator ikut bertanggung jawab untuk mengamati (observe), memeriksa (check), menyetel (adjust), membersihkan (clean), dan memberi tahu (notify) kondisi peralatannya. Total Productive Maintenance (TPM) mencakup merancang mesin yang andal dan mudah dirawat, menghitung total cost of ownership saat membeli mesin, menyusun rencana preventive maintenance dari praktik terbaik, dan melatih operator untuk autonomous maintenance.",
      rubric: "Tiga jenis maintenance 3; autonomous maintenance 2; TPM 2.",
    },
    {
      questionId: "soal-2c",
      maxPoints: 6,
      referenceAnswer:
        "Maintenance adalah semua kegiatan untuk menjaga kemampuan sistem agar tetap berfungsi. Reliability adalah peluang sebuah komponen, mesin, atau produk berfungsi dengan benar selama waktu tertentu pada kondisi tertentu. Effective reliability (Reff) memperluas reliability dengan memasukkan peluang kerusakan dikali peluang kerusakan itu tidak terdeteksi lebih awal: $$R_{eff} = 1 - [P(\\text{failure}) \\times P(\\text{tidak terdeteksi})]$$ Kalau kerusakan yang segera datang bisa dideteksi, perawatan dijadwalkan lebih dulu sehingga terhindar dari biaya breakdown mendadak, dan effective reliability naik. Redundancy berarti menyediakan komponen cadangan agar saat satu komponen gagal, ada cadangan yang menggantikan, sehingga keandalan sistem meningkat.",
      rubric:
        "Definisi reliability dan maintenance 2; konsep dan rumus effective reliability 3; peran redundancy 1.",
    },
    {
      questionId: "soal-3a",
      maxPoints: 7,
      referenceAnswer: `Nilai tiap kota dikali bobot lalu dijumlahkan.

- Bekasi = (0,30)(80) + (0,20)(60) + (0,25)(90) + (0,15)(85) + (0,10)(50) = 24 + 12 + 22,5 + 12,75 + 5 = 76,25.
- Semarang = (0,30)(75) + (0,20)(85) + (0,25)(70) + (0,15)(70) + (0,10)(80) = 22,5 + 17 + 17,5 + 10,5 + 8 = 75,50.
- Surabaya = (0,30)(70) + (0,20)(75) + (0,25)(80) + (0,15)(80) + (0,10)(70) = 21 + 15 + 20 + 12 + 7 = 75,00.

Karena Bekasi punya total tertimbang tertinggi (76,25), Bekasi yang dipilih.`,
      rubric:
        "Perhitungan tiga kota benar 5 (masing-masing sekitar 1,5 sampai 2); kesimpulan memilih Bekasi 2.",
    },
    {
      questionId: "soal-3b",
      maxPoints: 7,
      referenceAnswer: `Titik temu dicari dengan menyamakan total cost dua lokasi.

- A dan B: 200.000.000 + 35.000x = 400.000.000 + 25.000x, maka 10.000x = 200.000.000, sehingga x = 20.000 unit.
- B dan C: 400.000.000 + 25.000x = 700.000.000 + 15.000x, maka 10.000x = 300.000.000, sehingga x = 30.000 unit.

Maka A termurah saat volume di bawah 20.000 unit, B termurah antara 20.000 sampai 30.000 unit, dan C termurah di atas 30.000 unit. Pada volume 25.000 unit (berada di rentang B):

- A = 200.000.000 + 35.000(25.000) = Rp1.075.000.000.
- B = 400.000.000 + 25.000(25.000) = Rp1.025.000.000.
- C = 700.000.000 + 15.000(25.000) = Rp1.075.000.000.

Lokasi B paling murah pada 25.000 unit dengan total Rp1.025.000.000, sehingga lokasi B dipilih.`,
      rubric:
        "Dua crossover benar 3; total cost pada 25.000 unit 3; kesimpulan memilih B 1.",
    },
    {
      questionId: "soal-3c",
      maxPoints: 6,
      referenceAnswer: `$$C_x = \\frac{\\sum x_i Q_i}{\\sum Q_i}, \\quad C_y = \\frac{\\sum y_i Q_i}{\\sum Q_i}$$

ΣQi = 1.200 + 800 + 1.000 + 1.500 = 4.500.

Cx = ((20)(1.200) + (60)(800) + (100)(1.000) + (80)(1.500)) / 4.500 = 292.000 / 4.500 ≈ 64,9.

Cy = ((50)(1.200) + (90)(800) + (40)(1.000) + (70)(1.500)) / 4.500 = 277.000 / 4.500 ≈ 61,6.

Center of gravity ada di titik kira-kira (64,9 ; 61,6).`,
      rubric: "ΣQ benar 1; Cx benar 2,5; Cy benar 2,5.",
    },
    {
      questionId: "soal-4a",
      maxPoints: 6,
      referenceAnswer: `BOM explosion untuk 100 P:

- A = 2 x 100 = 200 unit.
- B = 3 x 100 = 300 unit.
- C = 1 x A = 1 x 200 = 200 unit.
- D = (2 x A) + (2 x B) = (2 x 200) + (2 x 300) = 400 + 600 = 800 unit.`,
      rubric: "A 1; B 1; C 2; D 2 (D harus menjumlahkan kontribusi dari A dan B).",
    },
    {
      questionId: "soal-4b",
      maxPoints: 8,
      referenceAnswer: `P dibutuhkan 100 unit di minggu 8, on-hand 0, jadi net 100 (planned order release 100 di minggu 7 karena lead time 1).

- A: gross = 2 x 100 = 200 di minggu 7; on-hand 50; net = 150; lead time 2, release 150 di minggu 5.
- B: gross = 3 x 100 = 300 di minggu 7; on-hand 0; net = 300; lead time 1, release 300 di minggu 6.
- C: gross = 1 x 150 = 150 di minggu 5 (mengikuti release A); on-hand 20; net = 130; lead time 2, release 130 di minggu 3.
- D (low-level coding, gabung kebutuhan dari A dan B): gross 300 di minggu 5 (dari release A, 2 x 150) dan 600 di minggu 6 (dari release B, 2 x 300). On-hand 100 dipakai pada kebutuhan pertama: minggu 5 net = 300 - 100 = 200 (release 200 di minggu 4); minggu 6 net = 600 (release 600 di minggu 5).`,
      rubric: "P 1; A 1,5; B 1,5; C 2; D dengan low-level coding 2.",
    },
    {
      questionId: "soal-4c",
      maxPoints: 6,
      referenceAnswer: `Lot-for-Lot memesan persis sebanyak net requirements tiap minggu yang ada permintaan. Ada 6 minggu berpermintaan (minggu 1, 3, 4, 6, 7, 8), jadi 6 kali setup. Holding cost nol karena tidak ada stok yang dibawa. Total Lot-for-Lot = 6 x Rp100.000 = Rp600.000.

POQ: total permintaan = 210 unit selama 8 minggu, rata-rata = 26,25 per minggu. $$EOQ = \\sqrt{\\frac{2DS}{H}}$$ EOQ = akar(2 x 26,25 x 100.000 / 1.000) ≈ 72,5 unit. Interval = 72,5 / 26,25 ≈ 2,76, dibulatkan menjadi 3 minggu. Maka pesanan dibuat setiap 3 minggu.

- Pesan di minggu 1 untuk minggu 1 sampai 3 = 40 + 0 + 30 = 70 unit.
- Pesan di minggu 4 untuk minggu 4 sampai 6 = 50 + 0 + 40 = 90 unit.
- Pesan di minggu 7 untuk minggu 7 sampai 8 = 30 + 20 = 50 unit.

Setup = 3 x Rp100.000 = Rp300.000. Holding (stok akhir tiap minggu dijumlah): minggu 1 sisa 30, minggu 2 sisa 30, minggu 3 sisa 0, minggu 4 sisa 40, minggu 5 sisa 40, minggu 6 sisa 0, minggu 7 sisa 20, minggu 8 sisa 0, total = 160 unit-minggu x Rp1.000 = Rp160.000. Total POQ = Rp300.000 + Rp160.000 = Rp460.000. Karena Rp460.000 lebih kecil dari Rp600.000, POQ lebih murah.`,
      rubric:
        "Total Lot-for-Lot benar 2; perhitungan POQ (interval, jumlah pesanan, holding) 3; kesimpulan POQ lebih murah 1.",
    },
    {
      questionId: "soal-5a",
      maxPoints: 8,
      referenceAnswer: `Total waktu proses semua job = 4 + 7 + 3 + 6 + 5 = 25 hari. Job lateness = max(0, flow time - due date).

- FCFS urutan A-B-C-D-E. Flow time 4, 11, 14, 20, 25; total flow 74. Average completion = 74/5 = 14,8 hari. Utilization = 25/74 = 33,8%. Average jobs in system = 74/25 = 2,96. Lateness 0, 0, 6, 3, 10; total 19; average = 3,8 hari. Maximum lateness 10.
- SPT urutan C-A-E-D-B. Flow time 3, 7, 12, 18, 25; total flow 65. Average completion = 13,0 hari. Utilization = 25/65 = 38,5%. Average jobs = 65/25 = 2,60. Lateness 0, 0, 0, 1, 9; total 10; average = 2,0 hari. Maximum lateness 9.
- EDD urutan A-C-E-B-D. Flow time 4, 7, 12, 19, 25; total flow 67. Average completion = 13,4 hari. Utilization = 25/67 = 37,3%. Average jobs = 67/25 = 2,68. Lateness 0, 0, 0, 3, 8; total 11; average = 2,2 hari. Maximum lateness 8.

SPT memberi average completion time terendah (13,0 hari) sekaligus average number of jobs in system terkecil. EDD memberi maximum lateness terkecil (8 hari).`,
      rubric:
        "Tiga urutan benar 1,5; metrik FCFS 1,5; metrik SPT 1,5; metrik EDD 1,5; kesimpulan SPT dan EDD 2.",
    },
    {
      questionId: "soal-5b",
      maxPoints: 5,
      referenceAnswer: `- X: CR = (28 - 20) / 5 = 1,60.
- Y: CR = (24 - 20) / 6 = 0,67.
- Z: CR = (30 - 20) / 8 = 1,25.
- W: CR = (22 - 20) / 2 = 1,00.

Job dengan CR terkecil dikerjakan lebih dulu, jadi urutan prioritas: Y, lalu W, lalu Z, lalu X. Job Y punya CR di bawah 1, artinya Y sudah terlambat dari jadwal. W dengan CR tepat 1 berada pas pada jadwal.`,
      rubric:
        "Empat nilai CR benar 3 (masing-masing 0,75); urutan prioritas 1; identifikasi Y terlambat 1.",
    },
    {
      questionId: "soal-5c",
      maxPoints: 7,
      referenceAnswer: `Aturan: ambil waktu paling kecil dari seluruh tabel. Kalau ada di WC1, jadwalkan paling awal yang tersedia; kalau di WC2, jadwalkan paling akhir yang tersedia. Coret job itu lalu ulangi. Waktu terkecil 2 (J2 di WC1) jadwalkan paling awal. Lalu 3 (J1 di WC2) jadwalkan paling akhir. Lalu 4 (J5 di WC1) ke posisi awal berikutnya, dan 4 (J3 di WC2) ke posisi akhir berikutnya. Sisanya J4 di tengah. Urutan: J2 - J5 - J4 - J3 - J1. Timeline (jam):

| Job | WC1 mulai | WC1 selesai | WC2 mulai | WC2 selesai |
|---|---|---|---|---|
| J2 | 0 | 2 | 2 | 9 |
| J5 | 2 | 6 | 9 | 15 |
| J4 | 6 | 11 | 15 | 23 |
| J3 | 11 | 20 | 23 | 27 |
| J1 | 20 | 26 | 27 | 30 |

Makespan (total waktu menyelesaikan semua job) = 30 jam, dengan WC2 menganggur 2 jam di awal sambil menunggu J2 selesai di WC1.`,
      rubric: "Penerapan aturan dan urutan benar 3; timeline 2; makespan 30 jam 2.",
    },
  ],

  cheatSheet: opsmgmtCheatSheet,
  calculator: true,
};
