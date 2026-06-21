import type { ExamData } from "@/types/exam";

/**
 * Foundations of Artificial Intelligence — Latihan Soal Prediksi UAS
 *
 * Converted verbatim from:
 *   "Foundations of Artificial Intelligence - Latihan Soal Prediksi UAS.pdf" (haistudy)
 *
 * IMPORTANT: Content must NOT be modified. All questions, answers, and rubrics
 * are exact transcriptions from the PDF. Bilingual (EN/ID) for questions,
 * Bahasa Indonesia only for answer keys and rubrics (matching the PDF).
 *
 * Structure: Type I True/False with reasoning (5 x 5 = 25), Type II Case Study
 * AI Solution Recommendation (Case 1 + Case 2, a/b/c x 10 = 60), Type III Case
 * Study Ethical Consideration (Case 3, a/b/c x 5 = 15). Total 100.
 *
 * Text fields may contain Markdown + KaTeX; literal `$` is safe (single-dollar
 * math is disabled in ExamMarkdown).
 */
export const foundaiExam: ExamData = {
  meta: {
    subjectId: "foundai",
    examId: "foundai-uas-pred-v1",
    title: {
      en: "UAS Prediction Practice Exam",
      id: "Latihan Soal Prediksi UAS",
    },
    academicYear: "2025 / 2026",
    semester: "Even (Genap)",
    examType: "Onsite, Theory",
    program: "Undergraduate, Business Management",
    courseName: "Foundations of Artificial Intelligence",
    date: "Wednesday / 24 June 2026",
    time: "15:00 - 16:40 WIB",
    durationMinutes: 100,
    totalScore: 100,
    formatDescription: {
      en: "True/False 25% (Type I) + Case Study 75% (Type II & III)",
      id: "True/False 25% (Type I) + Studi Kasus 75% (Type II & III)",
    },
    instructions: {
      en: "All questions must be answered. Answer using the theory and concepts from the material. The exam focuses more on case studies. For the True or False section, decide whether each statement is True or False and then write your reasoning. For case studies, apply the theory directly and do not write in the form of an article or paper. Total score is 100 points and the duration is 100 minutes.",
      id: "Semua soal wajib dijawab. Jawab dengan teori dan konsep dari materi. Ujian lebih fokus ke studi kasus. Untuk bagian True or False, tentukan apakah tiap pernyataan True atau False lalu tuliskan alasannya. Untuk studi kasus, terapkan teori secara langsung dan jangan menulis dalam bentuk artikel atau paper. Total nilai 100 poin dengan durasi 100 menit.",
    },
    banner: {
      en: "This is a UAS prediction practice paper. It is not an official BINUS exam paper. It was prepared from the course summaries (rangkuman) only, as a picture of the likely exam format.",
      id: "Ini adalah naskah latihan prediksi UAS. Bukan naskah ujian resmi BINUS. Disusun dari rangkuman materi saja, sebagai gambaran kemungkinan bentuk soal.",
    },
  },

  questions: [
    // ═══════════════════════════════════════════════
    // TYPE I. TRUE OR FALSE WITH REASONING (25 points)
    // ═══════════════════════════════════════════════
    {
      id: "tf",
      type: "true-false",
      sectionLabel: {
        en: "Type I: True or False with Reasoning (maximum 25 points)",
        id: "Type I: True or False dengan Alasan (maksimum 25 poin)",
      },
      points: 25,
      title: {
        en: "True or False with Reasoning",
        id: "True or False dengan Alasan",
      },
      context: {
        en: "For each statement, decide whether it is True or False, then write the reason for your choice in 2 to 4 sentences. Each item is worth 5 points (2 points for the correct True or False answer, 3 points for the reasoning).",
        id: "Untuk tiap pernyataan, tentukan apakah True atau False, lalu tuliskan alasan pilihan Anda dalam 2 sampai 4 kalimat. Tiap soal bernilai 5 poin (2 poin untuk jawaban True atau False yang benar, 3 poin untuk alasan).",
      },
      subQuestions: [
        {
          id: "tf-1",
          points: 5,
          question: {
            en: "In the IoT workflow, data moves in this order: Sensors, Devices, Connectivity, Cloud Computing, and then Analytics & Data Processing, and it is the Analytics & Data Processing stage that turns raw data into useful information for decision making.",
            id: "Dalam alur kerja IoT, data bergerak dengan urutan: Sensors, Devices, Connectivity, Cloud Computing, lalu Analytics & Data Processing, dan tahap Analytics & Data Processing inilah yang mengubah data mentah menjadi informasi berguna untuk pengambilan keputusan.",
          },
        },
        {
          id: "tf-2",
          points: 5,
          question: {
            en: "In the NAO robot, cameras, microphones, sonars, and the inertial unit belong to the Think group because their job is to process information.",
            id: "Pada robot NAO, cameras, microphones, sonars, dan inertial unit termasuk kelompok Think karena tugasnya mengolah informasi.",
          },
        },
        {
          id: "tf-3",
          points: 5,
          question: {
            en: "Content-Based Filtering recommends songs by finding other users whose taste is similar.",
            id: "Content-Based Filtering menyarankan lagu dengan mencari pengguna lain yang seleranya mirip.",
          },
        },
        {
          id: "tf-4",
          points: 5,
          question: {
            en: "High-Frequency Trading (HFT) and Robo-Advisors are both forms of fraud detection in finance.",
            id: "High-Frequency Trading (HFT) dan Robo-Advisors sama-sama termasuk bentuk fraud detection di sektor keuangan.",
          },
        },
        {
          id: "tf-5",
          points: 5,
          question: {
            en: "An AI loan-approval model that keeps repeating unfair lending because it was trained on past approval data that favored certain groups is an example of Data Bias.",
            id: "Model AI persetujuan pinjaman yang terus mengulang praktik pinjaman tidak adil karena dilatih dari data persetujuan masa lalu yang menguntungkan kelompok tertentu adalah contoh Data Bias.",
          },
        },
      ],
    },

    // ═══════════════════════════════════════════════
    // TYPE II. CASE STUDY, AI SOLUTION RECOMMENDATION (60 points)
    // ═══════════════════════════════════════════════
    {
      id: "case-1",
      type: "case-study",
      sectionLabel: {
        en: "Type II: Case Study, AI Solution Recommendation (maximum 60 points)",
        id: "Type II: Studi Kasus, Rekomendasi Solusi AI (maksimum 60 poin)",
      },
      points: 30,
      title: {
        en: "Case 1: RS Sehat Nusantara (Healthcare AI)",
        id: "Kasus 1: RS Sehat Nusantara (AI Kesehatan)",
      },
      context: {
        en: "_Answer using the theory and concepts from the material. Do not write in the form of an article or scientific paper. A suggested length for each sub-question is 120 to 180 words._\n\nRS Sehat Nusantara is a private hospital network operating in several cities in Indonesia. Management faces three recurring problems. First, reading medical images such as X-rays and CT scans is slow and sometimes differs between radiologists, so some diseases are found late. Second, administrative staff are overloaded with scheduling, medical records, and billing, which cuts the time available for patient care. Third, many chronic patients such as people with diabetes and heart disease live far from the hospital and are hard to monitor, so worsening conditions are often noticed too late. Management asks for an AI based solution that stays within healthcare AI uses that are already proven.",
        id: "_Jawab dengan teori dan konsep dari materi. Jangan menulis dalam bentuk artikel atau paper ilmiah. Panjang jawaban yang disarankan untuk tiap anak soal adalah 120 sampai 180 kata._\n\nRS Sehat Nusantara adalah jaringan rumah sakit swasta yang beroperasi di beberapa kota di Indonesia. Manajemen menghadapi tiga masalah yang berulang. Pertama, pembacaan citra medis seperti X-ray dan CT scan berjalan lambat dan kadang berbeda antar radiolog, sehingga sebagian penyakit ditemukan terlambat. Kedua, staf administrasi kewalahan mengurus penjadwalan, rekam medis, dan penagihan, sehingga waktu untuk merawat pasien berkurang. Ketiga, banyak pasien kronis seperti penderita diabetes dan penyakit jantung tinggal jauh dari rumah sakit dan sulit dipantau, sehingga kondisi yang memburuk sering terlambat diketahui. Manajemen meminta solusi berbasis AI yang tetap berada dalam pemakaian AI kesehatan yang sudah terbukti.",
      },
      subQuestions: [
        {
          id: "case-1a",
          points: 10,
          question: {
            en: "Recommend a suitable AI solution for at least two of the three problems above. State clearly which problem each solution addresses.",
            id: "Rekomendasikan solusi AI yang sesuai untuk minimal dua dari tiga masalah di atas. Sebutkan dengan jelas masalah mana yang ditangani tiap solusi.",
          },
        },
        {
          id: "case-1b",
          points: 10,
          question: {
            en: "Explain the AI technology used in your recommended solutions and how each one works, based on the material.",
            id: "Jelaskan teknologi AI yang dipakai dalam solusi yang Anda rekomendasikan dan bagaimana cara kerjanya, berdasarkan materi.",
          },
        },
        {
          id: "case-1c",
          points: 10,
          question: {
            en: "Explain the benefits of your solutions for the hospital and for the patients.",
            id: "Jelaskan manfaat solusi Anda bagi rumah sakit dan bagi pasien.",
          },
        },
      ],
    },
    {
      id: "case-2",
      type: "case-study",
      sectionLabel: {
        en: "Type II: Case Study, AI Solution Recommendation (maximum 60 points)",
        id: "Type II: Studi Kasus, Rekomendasi Solusi AI (maksimum 60 poin)",
      },
      points: 30,
      title: {
        en: "Case 2: Garuda Komponen (Smart Factory)",
        id: "Kasus 2: Garuda Komponen (Smart Factory)",
      },
      context: {
        en: "_Answer using the theory and concepts from the material. Do not write in the form of an article or scientific paper. A suggested length for each sub-question is 120 to 180 words._\n\nGaruda Komponen is an automotive parts manufacturer in Indonesia. The plant faces three issues. First, machines break down without warning, which stops production. Second, the flow between production and logistics is not well synchronized, which causes delays. Third, some assembly tasks need high precision that manual work struggles to keep consistent. Management wants an AI and IoT based solution that follows approaches already proven in smart factories.",
        id: "_Jawab dengan teori dan konsep dari materi. Jangan menulis dalam bentuk artikel atau paper ilmiah. Panjang jawaban yang disarankan untuk tiap anak soal adalah 120 sampai 180 kata._\n\nGaruda Komponen adalah produsen komponen otomotif di Indonesia. Pabriknya menghadapi tiga persoalan. Pertama, mesin rusak tanpa peringatan, sehingga produksi berhenti. Kedua, alur antara produksi dan logistik kurang selaras, sehingga muncul keterlambatan. Ketiga, sebagian tugas perakitan butuh ketelitian tinggi yang sulit dijaga konsisten kalau dikerjakan manual. Manajemen ingin solusi berbasis AI dan IoT yang mengikuti pendekatan yang sudah terbukti di smart factory.",
      },
      subQuestions: [
        {
          id: "case-2a",
          points: 10,
          question: {
            en: "Recommend a suitable AI and IoT solution for at least two of the problems above. State clearly which problem each solution addresses.",
            id: "Rekomendasikan solusi AI dan IoT yang sesuai untuk minimal dua dari masalah di atas. Sebutkan dengan jelas masalah mana yang ditangani tiap solusi.",
          },
        },
        {
          id: "case-2b",
          points: 10,
          question: {
            en: "Explain the technology used and how it works, based on the material.",
            id: "Jelaskan teknologi yang dipakai dan bagaimana cara kerjanya, berdasarkan materi.",
          },
        },
        {
          id: "case-2c",
          points: 10,
          question: {
            en: "Explain the benefits of your solutions for the company.",
            id: "Jelaskan manfaat solusi Anda bagi perusahaan.",
          },
        },
      ],
    },

    // ═══════════════════════════════════════════════
    // TYPE III. CASE STUDY, ETHICAL CONSIDERATION (15 points)
    // ═══════════════════════════════════════════════
    {
      id: "case-3",
      type: "case-study",
      sectionLabel: {
        en: "Type III: Case Study, Ethical Consideration (maximum 15 points)",
        id: "Type III: Studi Kasus, Pertimbangan Etika (maksimum 15 poin)",
      },
      points: 15,
      title: {
        en: "Case 3: BijakPinjam (AI Ethics)",
        id: "Kasus 3: BijakPinjam (Etika AI)",
      },
      context: {
        en: "_Answer using the theory and concepts from the material. A suggested length for each sub-question is 100 to 150 words._\n\nBijakPinjam is an Indonesian fintech lending startup. It uses an AI credit-scoring model to approve loans quickly. The model was trained mostly on past loan data, and early users notice that applicants from certain groups are rejected more often. To score applicants, the app collects a large amount of personal data, including data taken from social media. The model is complex, and even the team finds it hard to explain why a particular applicant was rejected.",
        id: "_Jawab dengan teori dan konsep dari materi. Panjang jawaban yang disarankan untuk tiap anak soal adalah 100 sampai 150 kata._\n\nBijakPinjam adalah startup fintech pinjaman di Indonesia. Perusahaan ini memakai model AI credit-scoring untuk menyetujui pinjaman dengan cepat. Model itu dilatih sebagian besar dari data pinjaman masa lalu, dan pengguna awal melihat pelamar dari kelompok tertentu lebih sering ditolak. Untuk menilai pelamar, aplikasinya mengumpulkan banyak data pribadi, termasuk data yang diambil dari media sosial. Modelnya rumit, dan bahkan timnya sendiri sulit menjelaskan kenapa seorang pelamar ditolak.",
      },
      subQuestions: [
        {
          id: "case-3a",
          points: 5,
          question: {
            en: "Identify and explain the main ethical risks in this AI deployment, based on the material.",
            id: "Identifikasi dan jelaskan risiko etika utama dalam penerapan AI ini, berdasarkan materi.",
          },
        },
        {
          id: "case-3b",
          points: 5,
          question: {
            en: "Explain the privacy considerations and protections that should be applied.",
            id: "Jelaskan pertimbangan privasi dan perlindungan yang sebaiknya diterapkan.",
          },
        },
        {
          id: "case-3c",
          points: 5,
          question: {
            en: "Explain how the company can ensure accountability and transparency.",
            id: "Jelaskan bagaimana perusahaan dapat memastikan accountability dan transparency.",
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
      questionId: "tf-1",
      maxPoints: 5,
      referenceAnswer:
        "Jawaban benar: True. Pernyataan ini benar. Sesuai alur kerja IoT, Sensors menangkap keadaan nyata seperti suhu, cahaya, atau gerakan; Devices mengolah dan menyiapkan sinyal sensor; Connectivity mengirim data lewat jaringan; Cloud Computing menyimpan dan mengolah data dalam jumlah besar; lalu Analytics & Data Processing mengubah data mentah menjadi informasi berguna untuk mengambil keputusan.",
      rubric:
        "Jawaban True atau False benar 2 poin, alasan yang menyebut urutan dan fungsi tiap tahap 3 poin.",
    },
    {
      questionId: "tf-2",
      maxPoints: 5,
      referenceAnswer:
        "Jawaban benar: False. Pernyataan ini salah. Sense adalah indra robot, mencakup cameras, microphones, FSRs & bumpers, sonars, MRE, dan inertial unit. Think adalah otak yang mengolah, mencakup Geode 500 MHz CPU, 256 MB SDRAM, 2 GB flash memory, serta software suite dengan SDK. Komponen yang disebut adalah indra, jadi masuk Sense, bukan Think.",
      rubric:
        "Jawaban True atau False benar 2 poin, alasan yang membedakan Sense dan Think dengan contoh komponen 3 poin.",
    },
    {
      questionId: "tf-3",
      maxPoints: 5,
      referenceAnswer:
        "Jawaban benar: False. Pernyataan ini salah. Collaborative Filtering menyarankan berdasarkan kemiripan selera antar pengguna, sedangkan Content-Based Filtering menyarankan berdasarkan ciri barang atau lagunya sendiri. Pada Spotify, content-based filtering membaca ciri audio seperti tempo, key, loudness, dan time signature. Pernyataan pada soal tertukar antara kedua metode.",
      rubric:
        "Jawaban True atau False benar 2 poin, alasan yang menjelaskan beda collaborative dan content-based filtering 3 poin.",
    },
    {
      questionId: "tf-4",
      maxPoints: 5,
      referenceAnswer:
        "Jawaban benar: False. Pernyataan ini salah. HFT menjalankan banyak transaksi dengan kecepatan sangat tinggi untuk memanfaatkan selisih harga dan peluang sesaat di pasar. Robo-Advisors menata penempatan dana dan menyusun strategi serta rencana investasi secara otomatis. Fraud detection memakai cara lain seperti transaction monitoring, behavioral biometrics, dan pattern recognition, jadi keduanya bukan fraud detection.",
      rubric:
        "Jawaban True atau False benar 2 poin, alasan yang menjelaskan fungsi HFT dan Robo-Advisors 3 poin.",
    },
    {
      questionId: "tf-5",
      maxPoints: 5,
      referenceAnswer:
        "Jawaban benar: True. Pernyataan ini benar. Data Bias lahir dari data latihan yang berat sebelah atau tidak mewakili semua kelompok, termasuk data yang mencerminkan sikap berat sebelah masa lalu. Contoh persetujuan pinjaman ini persis ilustrasi data bias pada materi. Cultural bias berkaitan dengan kebiasaan dan stereotype budaya, adversarial attack adalah usaha sengaja mengecoh model, dan differential privacy adalah teknik menjaga privasi.",
      rubric:
        "Jawaban True atau False benar 2 poin, alasan yang menyebut data latihan berat sebelah dan membedakan dari konsep lain 3 poin.",
    },
    {
      questionId: "case-1a",
      maxPoints: 10,
      referenceAnswer:
        "Pilih minimal dua. Untuk pembacaan citra medis, terapkan Enhanced Diagnostics atau Medical Imaging Analysis, yaitu AI yang membaca X-rays, MRIs, dan CT scans untuk menemukan kelainan dengan ketepatan setara atau melebihi radiolog, sehingga penyakit ditemukan lebih awal dan lebih tepat. Untuk beban administrasi, terapkan Operational Efficiency atau Administrative Automation, yaitu otomasi penjadwalan, pengelolaan rekam medis elektronik (EHRs), dan penagihan, didukung chatbots atau asisten virtual berbasis NLP. Untuk pasien kronis jarak jauh, terapkan Remote Monitoring and Telemedicine memakai wearable devices dan sensor untuk memantau kondisi pasien terus-menerus.",
      rubric:
        "1.a (10): identifikasi solusi tepat untuk minimal dua masalah dan menyebut masalah yang ditangani (5), ketepatan dan kesesuaian dengan materi (5).",
    },
    {
      questionId: "case-1b",
      maxPoints: 10,
      referenceAnswer:
        "Medical Imaging Analysis memakai Convolutional Neural Networks (CNNs) yang membaca citra seperti X-ray, MRI, dan CT scan serta sampel jaringan untuk menemukan kelainan secara otomatis, misalnya menemukan tumor di mammogram atau tanda stroke di citra otak, dan dilengkapi Clinical Decision Support yang menggabungkan data pasien untuk membantu diagnosis. Administrative Automation memakai natural language processing (NLP) lewat chatbots dan asisten virtual untuk tugas rutin seperti penjadwalan, pendaftaran, dan penagihan, serta Optimized Workflow yang menebak jumlah pasien masuk dan kebutuhan staf dari pola data. Remote Monitoring memakai wearable devices dan sensor yang mengalirkan data, lalu predictive analytics menebak kondisi yang memburuk, sesuai konsep AI in Chronic Disease Management dengan continuous monitoring.",
      rubric:
        "1.b (10): menyebut teknologi yang benar seperti CNN, NLP, dan wearable dengan predictive analytics (5), menjelaskan cara kerjanya (5).",
    },
    {
      questionId: "case-1c",
      maxPoints: 10,
      referenceAnswer:
        "Penyakit ditemukan lebih awal dan lebih tepat lewat enhanced diagnostics, sehingga keterlambatan diagnosis berkurang. Staf bisa lebih fokus merawat pasien karena tugas administrasi jadi otomatis, prosesnya lebih cepat, dan kesalahan berkurang lewat operational efficiency. Pasien kronis di daerah jauh tetap terpantau lewat telemedicine sehingga kondisi yang memburuk cepat ditangani, akses layanan meluas sesuai healthcare accessibility, dan penanganan jadi lebih personal lewat personalized treatment plans.",
      rubric:
        "1.c (10): manfaat yang jelas dan terhubung ke masalah (5), memakai keyword dari materi (5).",
    },
    {
      questionId: "case-2a",
      maxPoints: 10,
      referenceAnswer:
        "Pilih minimal dua. Untuk kerusakan mesin mendadak, terapkan predictive maintenance atau smart maintenance memakai Big Data untuk Wear Prediction, yaitu memperkirakan kapan komponen akan aus sebelum benar-benar rusak. Untuk sinkronisasi produksi dan logistik, terapkan konsep smart factory seperti Pearl chain concept yang menyelaraskan produksi dan logistik, driverless floor conveyors, dan driverless transport system, ditambah vehicle localization untuk melacak posisi kendaraan. Untuk tugas presisi, terapkan Robots in Manufacturing dengan AI-Robot synergy, yaitu robot ber-AI untuk precision tasks seperti assembly line work yang lebih tepat dan konsisten.",
      rubric:
        "2.a (10): identifikasi solusi tepat untuk minimal dua masalah dan menyebut masalah yang ditangani (5), ketepatan dan kesesuaian dengan materi (5).",
    },
    {
      questionId: "case-2b",
      maxPoints: 10,
      referenceAnswer:
        "IoT mengumpulkan data lewat sensors pada mesin, dan susunannya mengikuti AIoT architecture berbasis cloud. Device layer berisi sensors dan mesin sebagai sumber data, Connectivity layer mengirim data lewat IoT field gateways dan cloud gateways dalam bentuk streaming data, Cloud layer mengolah data lewat data storage, data processing, data visualization, dan data access via API, lalu User communication layer menampilkan insights lewat web portals dan mobile apps. Big Data dipakai untuk Wear Prediction agar perawatan dilakukan sebelum mesin rusak. AI-Robot synergy membuat robot lebih pintar dan lebih mudah menyesuaikan diri sehingga sanggup mengerjakan tugas presisi, dan contoh penerapan smart factory mencakup RFID untuk data kendaraan, driverless conveyors dan transport, serta virtual assembly planning.",
      rubric:
        "2.b (10): menyebut teknologi yang benar seperti lapisan AIoT architecture, Big Data wear prediction, dan AI-Robot synergy (5), menjelaskan cara kerjanya (5).",
    },
    {
      questionId: "case-2c",
      maxPoints: 10,
      referenceAnswer:
        "Produksi jadi lebih cepat, lebih tepat, dan lebih hemat sesuai tujuan robots in manufacturing. Kerusakan mendadak berkurang karena wear prediction memberi peringatan sebelum komponen aus, sehingga waktu berhenti produksi turun. Alur produksi dan logistik jadi lebih selaras lewat pearl chain concept dan driverless transport, dan lingkungan kerja jadi lebih aman sambil hasil kerja tetap efisien sesuai AI-Robot synergy.",
      rubric:
        "2.c (10): manfaat yang jelas dan terhubung ke masalah (5), memakai keyword dari materi (5).",
    },
    {
      questionId: "case-3a",
      maxPoints: 5,
      referenceAnswer:
        "Risiko etika utama ada tiga. Pertama, bias and fairness, yaitu model bisa mewarisi keberpihakan dari data latihan, baik berupa data bias maupun algorithmic bias, mirip contoh credit scoring yang menolak pelamar kelompok minoritas secara tidak adil sehingga muncul perlakuan yang membeda-bedakan. Kedua, privacy, yaitu pengumpulan banyak data pribadi termasuk dari media sosial menimbulkan kekhawatiran soal data collection and consent, data breaches, dan re-identification. Ketiga, transparency dan accountability, yaitu model seperti kotak hitam sulit dijelaskan padahal keputusan otomatis memengaruhi hak orang, dan harus jelas siapa yang bertanggung jawab.",
      rubric:
        "3.a (5): menyebut minimal dua risiko utama seperti bias, privacy, dan transparency atau accountability dengan istilah dari materi.",
    },
    {
      questionId: "case-3b",
      maxPoints: 5,
      referenceAnswer:
        "Perusahaan sebaiknya menerapkan Data Collection and Consent yang terbuka dan sukarela, serta Data Minimization, yaitu hanya mengambil data yang benar-benar perlu dan tidak menyimpannya terlalu lama. Selain itu pakai Privacy-Preserving Techniques seperti Encryption, Anonymization and Pseudonymization untuk menyamarkan personally identifiable information (PII), dan bila perlu Differential Privacy. Perusahaan juga harus mematuhi Data Protection Laws seperti GDPR dan CCPA, yang memberi pengguna hak untuk tahu, menolak, dan menghapus data pribadinya.",
      rubric:
        "3.b (5): menyebut teknik dan prinsip privasi seperti consent, data minimization, encryption atau anonymization, serta GDPR atau CCPA.",
    },
    {
      questionId: "case-3c",
      maxPoints: 5,
      referenceAnswer:
        "Perusahaan dapat menerapkan Explainability lewat Explainable AI (XAI) supaya keputusan bisa dijelaskan ke pelamar, dan mempertimbangkan Interpretable Models seperti decision trees jika memungkinkan. Perusahaan juga perlu melakukan Bias Detection and Mitigation memakai fairness metrics seperti statistical parity, equalized odds, disparate impact, dan demographic parity, serta audit data latihan. Terakhir, tetapkan accountability yang jelas soal siapa yang bertanggung jawab dan terapkan pertimbangan etika di seluruh AI lifecycle mulai dari design, data collection, model development, deployment, sampai evaluation, dengan mengacu pada regulatory frameworks dan pedoman AI yang dapat dipercaya.",
      rubric:
        "3.c (5): menyebut explainability atau XAI, fairness metrics atau audit, dan accountability atau penerapan etika di AI lifecycle.",
    },
  ],
};
