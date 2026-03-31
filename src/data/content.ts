import type { SubjectContent } from "@/types";

/**
 * Placeholder content for all 5 subjects.
 * Actual content (materi, kisi-kisi, flashcards, quiz) will be filled in later.
 * driveId values are placeholders - replace with real Google Drive file IDs.
 */
export const content: Record<string, SubjectContent> = {
  statistik: {
    materi: [
      { id: 1, title: "Introduction to Statistics", driveId: "1iJW_GQiv9fSMQZAZTJVRWIiGxBqxnZ4jsqsYP-dIh98", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Describing Data: Frequency Tables, Frequency Distributions, and Graphic Presentation", driveId: "10VWWLcEqE9m98dsb0k-J9xhwSBRzcCv6YlqHBs2a5vE", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "Describing Data: Numerical Measures", driveId: "1zuTLNB-_JXf3oVdjNDOacI4vfAPKsiMmZfsB5BPy1Ic", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "Introduction to Probability - A Survey of Probability Concepts", driveId: "1fptNciNWzhXfEyQyAISVl_VQSgCIWdK_oaIBX3zr0cw", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Continuous Probability Distributions", driveId: "1EGIHIxNhIMnPDM1EpfZIBEzhLv9WrLrHYvBLbSnx8Ys", type: "drive-gslides", session: "5-6", xp: 10 },
      { id: 6, title: "Discrete Probability Distributions", driveId: "1BfkJrC8Yqx0FKUFrBm90jHPO8YlnK-tcWWKs1XD_fNw", type: "drive-gslides", session: "7", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Descriptive Statistics", items: ["Mean, Median, Mode", "Standard Deviation", "Variance"] },
      { topic: "Data Presentation", items: ["Frequency Distribution", "Histogram", "Pie Chart"] },
      { topic: "Probability Basics", items: ["Probability Rules", "Conditional Probability"] },
    ],
    flashcards: [
      { id: 1, term: "Mean (Rata-rata)", definition: "Jumlah semua nilai dibagi banyaknya data" },
      { id: 2, term: "Median", definition: "Nilai tengah dari data yang sudah diurutkan" },
      { id: 3, term: "Mode (Modus)", definition: "Nilai yang paling sering muncul dalam kumpulan data" },
      { id: 4, term: "Standard Deviation", definition: "Ukuran penyebaran data dari nilai rata-ratanya" },
      { id: 5, term: "Variance", definition: "Kuadrat dari standard deviation" },
    ],
    quiz: [
      { id: 1, question: "Apa yang dimaksud dengan mean?", options: ["Nilai tengah", "Nilai rata-rata", "Nilai terbanyak", "Nilai terkecil"], answer: 1, category: "Module 1" },
      { id: 2, question: "Jika data: 2, 4, 4, 6, 8 - berapa mediannya?", options: ["2", "4", "6", "8"], answer: 1, category: "Module 1" },
      { id: 3, question: "Histogram digunakan untuk menampilkan?", options: ["Data kategorik", "Frekuensi distribusi", "Korelasi", "Regresi"], answer: 1, category: "Module 2" },
    ],
  },

  biseko: {
    materi: [
      { id: 1, title: "The Economics and Business Environment", driveId: "1wuqhJL6qMBcwRivuOCUPWx-zJtthODz5uTaKgA1Zons", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Business Organisations", driveId: "1nv-HlC_IWXVfwv84dQm_r8ozxcXZQ7cp-0xZQea2xo0", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "The Consumer and Demand", driveId: "1noJAlecisms8H7KLEZ0v8r9Itvy2R7v42nio9ijTz_c", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "The Working of Price Elasticity Using AI in Competitive Markets", driveId: "180lGg946jCk1StqnlnD8PZypOBmQCY9nQWFbJQuTKTY", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Costs of Production", driveId: "1c5keXgQiPAxSEiMEArQA3OwHsS9eFOw-urhrZx-r78o", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "Revenue and Profit", driveId: "1xobPa-Q1Z2VJN9-GETCmkdBjo9zU4RinMMhbhcBmg5U", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Profit Maximisation Under Perfect Competition and Monopoly", driveId: "1QnxSN4YQwdSildRBx3UZIerVWRvsh-h2u5uTHzFaEbQ", type: "drive-gslides", session: "7-8", xp: 10 },
      { id: 8, title: "Business in a Competitive Market", driveId: "1rF7yN6GNSK9knMa7G6aOYlQh9CLB4slKybwskSypS04", type: "drive-gslides", session: "9", xp: 10 },
      { id: 9, title: "Digital Marketing Using AI as Alternative Aims Marketing Strategy", driveId: "1V3wmxWIcHpa9kI06ykW3tGB_6W3nz7bXlWBCY_0yjKc", type: "drive-gslides", session: "10", xp: 10 },
      { id: 10, title: "Profit Maximisation Under Imperfect Competition", driveId: "1VRgtJn_qiJMkgdRRQqVx_mDlDq71dCpu8W2aYHUx90M", type: "drive-gslides", session: "11-12", xp: 10 },
      { id: 11, title: "Multinational Corporations in a Global Economy Used AI", driveId: "1ni_bAC4XwfAqxlXFKB_WclG-yVkc8i9qIgRuLBTOgRE", type: "drive-gslides", session: "13", xp: 10 },
      { id: 12, title: "Business Strategy in a Global Economy", driveId: "1LLunzhpgrjIDfMKIIgKUwl9FfYJbVUSMGVZkZiIpc2I", type: "drive-gslides", session: "14", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Supply & Demand", items: ["Law of Demand", "Law of Supply", "Equilibrium"] },
      { topic: "Market Structures", items: ["Perfect Competition", "Monopoly", "Oligopoly"] },
      { topic: "Cost Analysis", items: ["Fixed Cost", "Variable Cost", "Marginal Cost"] },
    ],
    flashcards: [
      { id: 1, term: "Law of Demand", definition: "Semakin tinggi harga, semakin rendah permintaan (ceteris paribus)" },
      { id: 2, term: "Law of Supply", definition: "Semakin tinggi harga, semakin tinggi penawaran (ceteris paribus)" },
      { id: 3, term: "Equilibrium", definition: "Titik keseimbangan di mana supply bertemu demand" },
      { id: 4, term: "Elasticity", definition: "Ukuran responsivitas permintaan/penawaran terhadap perubahan harga" },
    ],
    quiz: [
      { id: 1, question: "Apa yang terjadi pada permintaan jika harga naik?", options: ["Naik", "Turun", "Tetap", "Tidak tentu"], answer: 1, category: "Module 2" },
      { id: 2, question: "Pasar dengan banyak penjual dan produk homogen disebut?", options: ["Monopoli", "Oligopoli", "Perfect Competition", "Monopolistic Competition"], answer: 2, category: "Module 3" },
    ],
  },

  cbkwn: {
    materi: [
      { id: 1, title: "Introduction to Civics Education", driveId: "18YKXhEKgx9HrTV9bUNaQ0wKje2aJFMMh9iZ42yTbxLs", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Values and Social Norms", driveId: "1vWDcEhJJnLG5YY0WoGQ5awjm-G2-zPtJJD7_TJH602k", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "State and Constitution", driveId: "1RGANnNYxIKYVlQPlxTR5sDMpTmdZrsU8-HtlvM6NCrM", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "The Rights and Obligations of the State and Its Citizens", driveId: "1bT7Kfziut3UqdFQ-I04v_U70u1hnPmViNEQKMZ7GY0k", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Law Enforcement in Indonesia", driveId: "1qcYHX2UbMh8uPDLS1ER7axf5zHzLXxQgPUrDpaREQ3s", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "The Dynamics of Democracy in Indonesia", driveId: "1Z74zyZUyggUM2ya9saHkgBA5gPHMfg3T85kQTCiLGmg", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Wawasan Nusantara", driveId: "1Fzp3N1g_Uj57_t8Ljprr55iLfAFPntwzljY7OsI48mA", type: "drive-gslides", session: "7", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Kewarganegaraan", items: ["Definisi WNI", "Hak dan Kewajiban", "UUD 1945"] },
      { topic: "Pancasila", items: ["Sejarah Pancasila", "Nilai-nilai Pancasila", "Implementasi"] },
    ],
    flashcards: [
      { id: 1, term: "Pancasila", definition: "Dasar negara dan ideologi bangsa Indonesia yang terdiri dari lima sila" },
      { id: 2, term: "UUD 1945", definition: "Undang-Undang Dasar Republik Indonesia sebagai hukum dasar tertinggi" },
      { id: 3, term: "Hak Asasi Manusia", definition: "Hak dasar yang melekat pada diri manusia sejak lahir" },
    ],
    quiz: [
      { id: 1, question: "Sila pertama Pancasila adalah?", options: ["Kemanusiaan yang adil", "Ketuhanan Yang Maha Esa", "Persatuan Indonesia", "Kerakyatan"], answer: 1, category: "Module 2" },
    ],
  },

  akuntansi: {
    materi: [
      { id: 1, title: "Introduction to Financial Statements", driveId: "1VwlgNlumK0iFGNM_oJueRe009SbQPje4sf2ekxbxicw", type: "drive-gslides", session: "1-2", xp: 10 },
      { id: 2, title: "The Accounting Information System", driveId: "1JxsMOoFx2pVze-EXriAOsrkCo7pdYP0xhYQxtMsIlRg", type: "drive-gslides", session: "3-4", xp: 10 },
      { id: 3, title: "Accrual Accounting Concepts", driveId: "1A9KZKpcv7SxXbS83PkR_hSlSS6Cil1HX6eUwL7a_5EI", type: "drive-gslides", session: "5-6", xp: 10 },
      { id: 4, title: "Merchandising Operations and the Multiple-Step Income Statement", driveId: "1AR_HcOXxPXl1GeZHmJg2PpVUl1nGcqWVeiND_rKk0Es", type: "drive-gslides", session: "7-8", xp: 10 },
      { id: 5, title: "Fraud, Internal Control, and Cash", driveId: "1aoODbRPZRCiYHPFu1Ihja8ZynSH2Gs-k3MklG3hAfc0", type: "drive-gslides", session: "9-10", xp: 10 },
      { id: 6, title: "Statement of Cash Flows", driveId: "1XEurk_BdkOEagXF-cgRl8YlRy2Auo7jLciyLCIH0cI0", type: "drive-gslides", session: "11-12", xp: 10 },
      { id: 7, title: "Financial Analysis: The Big Picture", driveId: "1LcbiKXHUAYLXdUEqD0D0tK91pUyTmg5Gy1qYCe6LM5o", type: "drive-gslides", session: "13-14", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Accounting Equation", items: ["Assets = Liabilities + Equity", "Double-entry system"] },
      { topic: "Journal & Ledger", items: ["Debit & Credit", "T-Account", "Trial Balance"] },
      { topic: "Financial Statements", items: ["Income Statement", "Balance Sheet", "Cash Flow"] },
    ],
    flashcards: [
      { id: 1, term: "Assets (Aset)", definition: "Sumber daya yang dimiliki perusahaan yang memberikan manfaat ekonomi di masa depan" },
      { id: 2, term: "Liabilities (Kewajiban)", definition: "Utang atau kewajiban perusahaan kepada pihak lain" },
      { id: 3, term: "Equity (Ekuitas)", definition: "Hak pemilik atas aset perusahaan setelah dikurangi kewajiban" },
      { id: 4, term: "Revenue (Pendapatan)", definition: "Peningkatan manfaat ekonomi dari aktivitas normal perusahaan" },
      { id: 5, term: "Expense (Beban)", definition: "Penurunan manfaat ekonomi berupa arus keluar aset" },
    ],
    quiz: [
      { id: 1, question: "Rumus persamaan akuntansi dasar adalah?", options: ["A = L + E", "A = L - E", "A + L = E", "E = A + L"], answer: 0, category: "Module 2" },
      { id: 2, question: "Debit untuk aset berarti?", options: ["Berkurang", "Bertambah", "Tetap", "Dihapus"], answer: 1, category: "Module 3" },
    ],
  },

  foundai: {
    materi: [
      { id: 1, title: "Introduction to AI", driveId: "1aFgoRe1OoMn-9k2UwS68Yka66fgm0CcKzSK50MwZDqQ", type: "drive-gslides", session: "1", xp: 10 },
      { id: 2, title: "Machine Learning Fundamental", driveId: "14gRF1T7IyXyKWNjw-YcekG3caFXg6jCUJtdkHWnnBQM", type: "drive-gslides", session: "2", xp: 10 },
      { id: 3, title: "AI and Data", driveId: "1rE1rP2Uss_8hqs4K5hZkQEpU5i9WhpR86wp4_TWLBKA", type: "drive-gslides", session: "3", xp: 10 },
      { id: 4, title: "Natural Language Processing", driveId: "1unbo9M70v1DBx8orx5Tn82rX6wwrwHrQfyiKRDlq0jY", type: "drive-gslides", session: "4", xp: 10 },
      { id: 5, title: "Speech Recognition", driveId: "1Nymy9b3ikMAWdLcScYWdsngN9t9q2xDnSrWzWnCyvXw", type: "drive-gslides", session: "5", xp: 10 },
      { id: 6, title: "Computer Vision", driveId: "1_f5pxwebXV-VQ3nBAHwj48MI9Ci1fMH4HyhbK1znT1Y", type: "drive-gslides", session: "6", xp: 10 },
      { id: 7, title: "Video Processing", driveId: "1sLyJNc-gFE6qjvSNSBu9fAGE5wiVwHTjiZV1iMtUPrs", type: "drive-gslides", session: "7", xp: 10 },
    ],
    kisiKisi: [
      { topic: "AI Fundamentals", items: ["Definition of AI", "Types of AI", "Turing Test"] },
      { topic: "Machine Learning", items: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning"] },
      { topic: "Neural Networks", items: ["Perceptron", "Activation Functions", "Backpropagation"] },
    ],
    flashcards: [
      { id: 1, term: "Artificial Intelligence", definition: "Simulasi kecerdasan manusia oleh mesin yang diprogram untuk berpikir dan belajar" },
      { id: 2, term: "Machine Learning", definition: "Subset AI di mana sistem belajar dari data tanpa diprogram secara eksplisit" },
      { id: 3, term: "Neural Network", definition: "Model komputasi yang terinspirasi dari jaringan saraf biologis otak manusia" },
      { id: 4, term: "Supervised Learning", definition: "Tipe ML di mana model dilatih dengan data berlabel (input-output)" },
      { id: 5, term: "Deep Learning", definition: "Subset ML yang menggunakan neural network dengan banyak layer tersembunyi" },
    ],
    quiz: [
      { id: 1, question: "Siapa yang memperkenalkan Turing Test?", options: ["Alan Turing", "John McCarthy", "Marvin Minsky", "Geoffrey Hinton"], answer: 0, category: "Module 1" },
      { id: 2, question: "Supervised Learning membutuhkan?", options: ["Data tanpa label", "Data berlabel", "Data real-time", "Tidak ada data"], answer: 1, category: "Module 2" },
    ],
  },
};

export function getContentBySubjectId(subjectId: string): SubjectContent | undefined {
  return content[subjectId];
}
