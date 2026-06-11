import type { SubjectContent } from "@/types";
import { marketingFlashcards } from "./marketing-flashcards";
import { marketingQuiz } from "./marketing-quiz";
import { hrFlashcards } from "./hr-flashcards";
import { hrQuiz } from "./hr-quiz";
import { introFlashcards } from "./intro-flashcards";
import { introQuiz } from "./intro-quiz";
import { misFlashcards } from "./mis-flashcards";
import { misQuiz } from "./mis-quiz";

// Scope s1-uts-bm (Semester 1, UTS, Business Management, batch B29).
// Materi link to the Drive folder "Kisi Kisi UTS BM B29". kisiKisi / flashcards
// / quiz / rangkuman are authored per subject (see *-flashcards.ts, *-quiz.ts,
// *-m{N}.ts + rangkuman.ts) and wired in as each subject is completed.
export const content: Record<string, SubjectContent> = {
  marketing: {
    materi: [
      { id: 1, title: "Chapter 1: Marketing - Creating Customer Value and Engagement", driveId: "1K_-cKLu3BNH2_HVRBdp77vzfliz0gTJ5", type: "drive-pptx", session: "1", xp: 10 },
      { id: 2, title: "Chapter 2: Company and Marketing Strategy", driveId: "1oeGdwBxe_pOKBL7b4STFtm_6c8w-PLiR", type: "drive-pptx", session: "2", xp: 10 },
      { id: 3, title: "Chapter 3: Analyzing the Marketing Environment", driveId: "1LFbZOK_22TWhYCIyJzZQAYJoxU7Kdbv5", type: "drive-pptx", session: "3", xp: 10 },
      { id: 4, title: "Chapter 4: Managing Marketing Information to Gain Customer Insights", driveId: "1hBirGx0BtoLAsQt7zMyGudyBYRWHQ_Iy", type: "drive-pptx", session: "4", xp: 10 },
      { id: 5, title: "Chapter 5: Consumer Markets and Consumer Buyer Behavior", driveId: "1pZy4l4S5bCwWdcFB_NggzWksg5UDhGpc", type: "drive-pptx", session: "5", xp: 10 },
      { id: 6, title: "Chapter 6: Business Markets and Business Buyer Behavior", driveId: "1dk65Z5wPALcD4zkrL_okNFvkxAHLE2_e", type: "drive-pptx", session: "6", xp: 10 },
      { id: 7, title: "Chapter 7: Customer Value-Driven Marketing Strategy", driveId: "15U3CEFpjTksszB512NiKHDDlwVDMS4pf", type: "drive-pptx", session: "7", xp: 10 },
      { id: 8, title: "Chapter 8: Products, Services, and Brands - Building Customer Value", driveId: "1TSqTtBND0fsrcDbOmb7r2jG6W3xc3Xie", type: "drive-pptx", session: "8", xp: 10 },
      { id: 9, title: "Chapter 10: Pricing - Understanding and Capturing Customer Value", driveId: "16vkNAUTitiu6vfzsOeifFGdQhwM_A0Iq", type: "drive-pptx", session: "10", xp: 10 },
      { id: 900, title: "E-Book Pearson: Principles of Marketing", driveId: "1hyK3YpZZIYGtXSnUSmgWSkGPL740MNjmdhQhBn41mIg", type: "drive-gdoc", xp: 5, sectionLabel: "Materi Tambahan - Referensi & Mentor" },
      { id: 901, title: "PPT Kisi-Kisi Mentor MM (Ringkasan sesuai soal tahun lalu)", driveId: "1S0prFOzrQltYUs-XODrk60gKmRN2ePCl", type: "drive-pdf", xp: 5, sectionLabel: "Materi Tambahan - Referensi & Mentor" },
    ],
    kisiKisi: [
      { section: "Sesi 1-2 (Ch.1): Konsep Inti Pemasaran", number: "1", topic: "Definisi & Proses Pemasaran", items: ["Definisi: create value & capture value", "The Marketing Process (5 langkah) - hafal urutan & contoh", "STP & 4P sebagai bagian dari proses"] },
      { section: "Sesi 1-2 (Ch.1): Konsep Inti Pemasaran", number: "2", topic: "5 Core Marketplace Concepts", items: ["Needs, Wants, Demands", "Market Offerings", "Value & Satisfaction", "Exchanges & Relationships", "Markets"] },
      { section: "Sesi 1-2 (Ch.1): Konsep Inti Pemasaran", number: "3", topic: "Marketing Management Concepts", items: ["Selling Concept (inside-out)", "Marketing Concept (outside-in)"] },
      { section: "Sesi 1-2 (Ch.1): Konsep Inti Pemasaran", number: "4", topic: "CRM & Customer Relationship Groups", items: ["Strangers, Butterflies, True Friends, Barnacles", "Strategi penanganan tiap kelompok"] },
      { section: "Sesi 3-4 (Ch.2): Strategi Perusahaan & Pemasaran", number: "1", topic: "Strategic Planning Steps", items: ["Mission (market-oriented)", "Objectives & goals", "Designing business portfolio", "Functional strategies"] },
      { section: "Sesi 3-4 (Ch.2): Strategi Perusahaan & Pemasaran", number: "2", topic: "BCG Growth-Share Matrix", items: ["Dimensi: Market Growth Rate & Relative Market Share", "Stars, Cash Cows, Question Marks, Dogs"] },
      { section: "Sesi 3-4 (Ch.2): Strategi Perusahaan & Pemasaran", number: "3", topic: "Product/Market Expansion Grid (Ansoff)", items: ["Market Penetration", "Market Development", "Product Development", "Diversification"] },
      { section: "Sesi 3-4 (Ch.2): Strategi Perusahaan & Pemasaran", number: "4", topic: "Marketing Mix (4P)", items: ["Product, Price, Place, Promotion"] },
      { section: "Sesi 5-6 (Ch.3 & 4): Lingkungan Pemasaran", number: "1", topic: "Micro Environment", items: ["Company, Suppliers, Marketing Intermediaries, Competitors, Publics, Customers"] },
      { section: "Sesi 5-6 (Ch.3 & 4): Lingkungan Pemasaran", number: "2", topic: "Macro Environment", items: ["Demographic, Economic, Natural, Technological, Political, Cultural"] },
      { section: "Sesi 5-6 (Ch.3 & 4): Lingkungan Pemasaran", number: "3", topic: "Marketing Research Process", items: ["Define problem & objectives", "Develop research plan", "Implement", "Interpret & report findings"] },
      { section: "Sesi 9-10 (Ch.5 & 6): Perilaku Konsumen", number: "1", topic: "Factors Influencing Consumer Behavior", items: ["Cultural", "Social", "Personal", "Psychological"] },
      { section: "Sesi 9-10 (Ch.5 & 6): Perilaku Konsumen", number: "2", topic: "Maslow Hierarchy of Needs", items: ["Physiological - Safety - Social - Esteem - Self-actualization"] },
      { section: "Sesi 9-10 (Ch.5 & 6): Perilaku Konsumen", number: "3", topic: "Types of Buying Decision Behavior", items: ["Complex, Dissonance-reducing, Habitual, Variety-seeking"] },
      { section: "Sesi 9-10 (Ch.5 & 6): Perilaku Konsumen", number: "4", topic: "Buyer Decision Process (5 tahap)", items: ["Need recognition, Information search, Evaluation, Purchase, Postpurchase"] },
      { section: "Sesi 9-10 (Ch.5 & 6): Perilaku Konsumen", number: "5", topic: "Business Market & B2B Behavior", items: ["Buying center & 5 peran", "8 tahap proses pembelian bisnis"] },
      { section: "Materi Tambahan (Ch.7): Customer Value-Driven Strategy", number: "1", topic: "Market Segmentation", items: ["Geographic, Demographic, Psychographic, Behavioral"] },
      { section: "Materi Tambahan (Ch.7): Customer Value-Driven Strategy", number: "2", topic: "Market Targeting Strategies", items: ["Undifferentiated, Differentiated, Concentrated (Niche), Micromarketing"] },
      { section: "Materi Tambahan (Ch.7): Customer Value-Driven Strategy", number: "3", topic: "Differentiation & Positioning", items: ["Positioning Maps", "Value Proposition (5 winning)", "Positioning Statement"] },
    ],
    kisiKisiNote: "Kisi-kisi inti UTS Marketing Management (B29), fokus pada pemahaman konsep/teori. Cakupan utama: Chapter 1-7 + perilaku pembeli bisnis (B2B). Lihat juga rangkuman untuk Chapter 8 (Products, Services & Brands) dan Chapter 10 (Pricing). Manfaatkan flashcards & kuis untuk latihan.",
    flashcards: marketingFlashcards,
    quiz: marketingQuiz,
  },

  hr: {
    materi: [
      { id: 1, title: "Session 1: Introduction to Human Resource Management", driveId: "1qwLSeUxB-rd7pgeEzhBHFRZjsmGqkrPN", type: "drive-pptx", session: "1", xp: 10 },
      { id: 2, title: "Session 2: Job Analysis & Talent Management", driveId: "1bjtax5n3owCUMJQS6n3j4u9r68YBD4gU", type: "drive-pptx", session: "2", xp: 10 },
      { id: 3, title: "Session 3: Personnel Planning & Recruiting", driveId: "1cF1qQTw94UOF8UVoIVmL5NGBSv8WzLB4", type: "drive-pptx", session: "3", xp: 10 },
      { id: 4, title: "Session 4: Testing & Selection", driveId: "1lB0XiyBsB15B_l3VU77MHBExMLPdkET0", type: "drive-pptx", session: "4", xp: 10 },
      { id: 5, title: "Session 5-6: Interviewing Candidates", driveId: "1x4U3dTCa0aMn7XjazLrmsDG_fM7R1YVW", type: "drive-pptx", session: "5-6", xp: 10 },
      { id: 6, title: "Session 7-8: Training and Development", driveId: "1-ZD7NN5GWFq9LYhUdJW42AW0L67VkB79", type: "drive-pptx", session: "7-8", xp: 10 },
      { id: 7, title: "Session 9: Equal Opportunity & the Law", driveId: "11tzfHCBBF47-3B5SJz9WKlVPVjKlxzxH", type: "drive-pptx", session: "9", xp: 10 },
      { id: 8, title: "Session 10: Building Positive Employee Relations", driveId: "1ibSd3dbdwEsFvrgTbC18w4rky_TnoL0t", type: "drive-pptx", session: "10", xp: 10 },
      { id: 9, title: "Session 11-12: Managing Careers and Retention I & II", driveId: "1t2-gwzArOPo6_XCC12o1DiQyOmLsMTtA", type: "drive-pptx", session: "11-12", xp: 10 },
      { id: 10, title: "Session 13: Business Ethics & Corporate Social Responsibility", driveId: "15t92XB35u3p-IVJ3uIceff6TB8Tcmnys", type: "drive-pptx", session: "13", xp: 10 },
      { id: 11, title: "Session 14: Benefits and Services", driveId: "1BXrnbLGQY-YwIZofdMoEiN64fe-r5btd", type: "drive-pptx", session: "14", xp: 10 },
      { id: 12, title: "Session 15-16: Performance Management and Appraisal I & II", driveId: "1z7EFiKmCUDzDb4dNyx9AiQ1SRmOA6HFA", type: "drive-pptx", session: "15-16", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Konsep Dasar Manajemen (POAC)", items: ["Planning, Organizing, Actuating, Controlling", "Boleh dijawab via mind map, deskripsi, atau flowchart"] },
      { topic: "Tantangan VUCA", items: ["Volatility, Uncertainty, Complexity, Ambiguity"] },
      { topic: "Introduction to HRM", items: ["Konsep dasar HRM dari seluruh PPT", "Line vs Staff authority"] },
      { topic: "Job Analysis", items: ["Job desk & job description", "Kinerja rendah umumnya akibat analisis pekerjaan tidak akurat"] },
      { topic: "Personnel Planning", items: ["Manpower / Workforce Planning", "Hasil akhir planning & organizing = proses recruiting"] },
      { topic: "Testing & Selection", items: ["Pengujian & seleksi kandidat", "Dilanjutkan ke tahap interview"] },
      { topic: "Interview & Interview II", items: ["Metode STAR (Situation, Task, Action, Result)", "Tahap akhir = offering (karier & kompensasi)", "Kesesuaian kandidat dengan posisi & budaya"] },
      { topic: "Training and Development", items: ["Model ADDIE: Analyze, Design, Develop, Implement, Evaluate", "Nilai peningkatan/perubahan setelah pelatihan"] },
      { topic: "Equal Opportunity", items: ["Kesetaraan, terutama gender", "Tanpa diskriminasi dalam rekrutmen, promosi, kompensasi"] },
      { topic: "Building Positive Relations", items: ["Peran serikat pekerja (labor union)", "Jembatan antara employee & employer"] },
      { topic: "Career and Retention", items: ["Jenjang karier & retensi", "Pertahankan best employee, evaluasi yang kurang produktif"] },
      { topic: "ESG & Good Corporate Governance", items: ["Environmental, Social, Governance", "Etika, tanggung jawab sosial, keberlanjutan"] },
      { topic: "Total Compensation", items: ["31% benefits (tunjangan)", "69% wages & salary (upah & gaji pokok)"] },
      { topic: "Hubungan Talent Management dengan Performance", items: ["Talent management meningkatkan kinerja organisasi", "Pengembangan karyawan berbakat -> produktivitas & tujuan jangka panjang"] },
    ],
    kisiKisiNote: "Catatan dosen: jawaban harus lengkap & relevan - jika diminta penjelasan singkat (mis. 2 baris), tetap beri sekitar 5-10 baris padat sesuai konteks. HRM mencakup total 14 bab. Penjelasan boleh berupa mind map, deskripsi singkat, atau flowchart.",
    flashcards: hrFlashcards,
    quiz: hrQuiz,
  },

  mis: {
    materi: [
      { id: 1, title: "Session 1-2: Information Systems in Global Business Today", driveId: "1GC17CQLnyLPHrSmV59mckyv_bY286qbE", type: "drive-pdf", session: "1-2", xp: 10 },
      { id: 2, title: "Session 3-4: Global E-Business and Collaboration", driveId: "1QUTyYTcSl1uwYqytvcMvO23nLJqMat0k", type: "drive-pptx", session: "3-4", xp: 10 },
      { id: 3, title: "Session 5-6", driveId: "1fpoFcoo-MaPz1VKDoUMgmrApb_rkU0s5", type: "drive-pptx", session: "5-6", xp: 10 },
      { id: 4, title: "Session 7-8", driveId: "1CkTDMIPY55pRFZcwDRpAFJMZo1SFWfRs", type: "drive-pptx", session: "7-8", xp: 10 },
      { id: 5, title: "Session 9: Ethical and Social Issues in Information Systems", driveId: "1bEBHYt5POm2yXW9-Ay0tFqEVOrJ92srT", type: "drive-pptx", session: "9", xp: 10 },
      { id: 6, title: "Session 10: Securing Information Systems", driveId: "1OnVWGuQvvSbVd4Wu4Gz2LKTSEmEZRgOR", type: "drive-pptx", session: "10", xp: 10 },
      { id: 7, title: "Session 11-12: Foundations of Business Intelligence - Databases and Information Management", driveId: "1v-W-hZl2WDce9vdbIeIxPbMy5GAePbGN", type: "drive-pptx", session: "11-12", xp: 10 },
      { id: 8, title: "Session 13-14: Telecommunications, the Internet, and Wireless Technology", driveId: "1La0HNbexaF80uhC4ve-KaezcIPo9CGQA", type: "drive-pptx", session: "13-14", xp: 10 },
      { id: 9, title: "Session 15-16: E-Commerce - Digital Markets, Digital Goods", driveId: "1nElEY_KKjF1RTLBXu_aK2pUbDPy0o0pl", type: "drive-pptx", session: "15-16", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Topik 1-2: Konsep SI & Data menjadi Informasi", items: ["Data vs Information", "4 aktivitas SI: Input, Processing, Output, Feedback", "Hierarki data: Bit-Byte-Field-Record-File-Database"] },
      { topic: "Strategic Role of IS", items: ["6 tujuan strategis bisnis dari SI", "Operational Excellence; New Products/Services/Business Models; Customer & Supplier Intimacy; Improved Decision Making; Competitive Advantage; Survival"] },
      { topic: "Topik 3: IS, Organizations & Strategy", items: ["Porter's Five Forces", "4 strategi generik: Low-Cost Leadership, Differentiation, Niche, Customer/Supplier Intimacy", "Business Value Chain (Primary & Support activities)"] },
      { topic: "Studi Kasus 1: IT Infrastructure & Cloud", items: ["Service models: IaaS, PaaS, SaaS", "Deployment models: Public, Private, Hybrid", "TCO sebagai dasar keputusan pindah ke cloud"] },
      { topic: "Topik 5: Data Privacy, Ethics & Security", items: ["5 dimensi moral, FIP, GDPR", "Malware: Virus, Worm, Trojan, DoS/DDoS, Phishing, SQL Injection", "Pengaman: Authentication, Firewall, Encryption"] },
      { topic: "Topik 6: Database & Business Intelligence", items: ["RDBMS: Field, Record, Primary/Foreign Key", "Operasi: SELECT, PROJECT, JOIN, Normalization, ERD", "Big Data, Data Warehouse/Mart, OLAP, Hadoop"] },
    ],
    kisiKisiNote: "Kisi-kisi UTS Management Information Systems for Leader (B29). Sebagian soal berbentuk studi kasus dari sudut pandang seorang leader (mis. Cloud Storage Implementation). Kuasai konsep inti tiap topik di atas.",
    flashcards: misFlashcards,
    quiz: misQuiz,
  },

  intro: {
    materi: [
      { id: 1, title: "Session 1: Challenges in the Workplace", driveId: "1w_9gcpnlwwLhsELA8E-OdkwTpdiz8dNY", type: "drive-pptx", session: "1", xp: 10 },
      { id: 2, title: "Session 2: Manager's Role in the Workplace", driveId: "1a3UpvnH_17V2cOGBdicyoJg5SExy5oRk", type: "drive-pptx", session: "2", xp: 10 },
      { id: 3, title: "Session 3: Managing Diversity", driveId: "1NNstYyg56lL-zeFP8NByom8QFDXaUdvc", type: "drive-pptx", session: "3", xp: 10 },
      { id: 4, title: "Session 4: Managing Social Responsibility", driveId: "1asEhY52sqPTVA_W6QyFYDUkIQGb0ktTL", type: "drive-pptx", session: "4", xp: 10 },
      { id: 5, title: "Session 5: Decision Making I", driveId: "14O0o-WGz-DhGh6UvUiziJDg8pv0MPydJ", type: "drive-pptx", session: "5", xp: 10 },
      { id: 6, title: "Session 6: Decision Making II", driveId: "1KUQ-imA4P3nq4qkxKUyzK4eXPbRq6gRw", type: "drive-pptx", session: "6", xp: 10 },
      { id: 7, title: "Session 7: Planning Work Activities I", driveId: "1AlatmUJtVnwa34zkM2Bt54UketfD6K3x", type: "drive-pptx", session: "7", xp: 10 },
      { id: 8, title: "Session 8: Planning Work Activities II", driveId: "189S6LVA6Bjc7pWQ4GCcK9aABLORkuAIL", type: "drive-pptx", session: "8", xp: 10 },
      { id: 9, title: "Session 9: Designing Organizational Structure I", driveId: "1aI-8T6BI_Fsjf7rRh2T4ptxUmJnpkMC5", type: "drive-pptx", session: "9", xp: 10 },
      { id: 10, title: "Session 10: Designing Organizational Structure II", driveId: "1NO-jPItjgY1DYIgsxI9SBTl2ThtvvLah", type: "drive-pptx", session: "10", xp: 10 },
      { id: 11, title: "Session 11: Creating and Managing Teams", driveId: "1IUq4Pj_pqEfOgq4r-XodVLiTbzL4uMJ4", type: "drive-pptx", session: "11", xp: 10 },
      { id: 12, title: "Session 12: Managing Conflict", driveId: "1SXMlds1wL9MnOKFb8vSP_lv-3O8knK-A", type: "drive-pptx", session: "12", xp: 10 },
      { id: 13, title: "Session 13: Managing Communication I", driveId: "10jgvKj1Rf4coc9SLKgnB0RoKXx562K2d", type: "drive-pptx", session: "13", xp: 10 },
      { id: 14, title: "Session 14: Managing Communication II", driveId: "1FHss-6TAw4hhb6KJ8ybobEgNEjtNeGw7", type: "drive-pptx", session: "14", xp: 10 },
    ],
    kisiKisi: [
      { topic: "Workplace & Manager's Role", items: ["Organisasi & manajemen", "Efficiency vs Effectiveness", "Mintzberg's 10 managerial roles", "Evolusi teori manajemen"] },
      { topic: "Managing Diversity", items: ["Surface vs deep-level diversity", "Manfaat & tantangan diversity", "Glass Ceiling"] },
      { topic: "Managing Social Responsibility (CSR)", items: ["Classical vs Socioeconomic view", "4 pendekatan Go-Green: Legal, Market, Stakeholder, Activist"] },
      { topic: "Decision Making", items: ["8 langkah pengambilan keputusan", "Bounded Rationality & Satisficing", "Programmed vs Nonprogrammed", "Biases: Anchoring & Availability"] },
      { topic: "Planning Work Activities", items: ["Strategic/Operational, Single-Use/Standing, Specific/Directional", "Contingency factors in planning", "MBO"] },
      { topic: "Designing Organizational Structure", items: ["6 elemen desain organisasi", "Mechanistic vs Organic", "Desain tradisional & kontemporer"] },
      { topic: "Creating & Managing Teams", items: ["Group vs Team", "Tuckman: Forming-Storming-Norming-Performing-Adjourning", "Cohesiveness x Goal Alignment"] },
      { topic: "Managing Conflict", items: ["Functional vs Dysfunctional", "Task / Relationship / Process conflict", "Inverted-U Model"] },
      { topic: "Managing Communication", items: ["Proses komunikasi 7 elemen + Noise", "Arah: Downward, Upward, Lateral, Diagonal, Grapevine", "Jaringan: Chain, Wheel, All-Channel"] },
    ],
    kisiKisiNote: "Kisi-kisi UTS Introduction to Management & Business (B29). Fokus pada pemahaman konsep & kemampuan menganalisis kasus nyata menggunakan teori manajemen.",
    flashcards: introFlashcards,
    quiz: introQuiz,
  },

  pancasila: {
    materi: [
      { id: 1, title: "Session 1: The History of Pancasila", driveId: "1KhwS03o6ppgmsA69dwKllBrVMnqfLkIN", type: "drive-pptx", session: "1", xp: 10 },
      { id: 2, title: "Session 2: Introduction - Pancasila as the Source of Character Education and State Ideology", driveId: "1-c6s_H_sBHNmDO6HpKkFfgTUySuD3SKZ", type: "drive-pptx", session: "2", xp: 10 },
      { id: 3, title: "Session 3: Pancasila and the World Ideologies", driveId: "1FUyr8Xl-eznR40MhxGotqV1iSIpFakFy", type: "drive-pptx", session: "3", xp: 10 },
      { id: 4, title: "Session 4: Pancasila and Religious Diversity in Indonesia", driveId: "1sAHgaFLUa_2LEe58AfVElSaXPoUsb8Va", type: "drive-pptx", session: "4", xp: 10 },
      { id: 5, title: "Session 5: Justice and Civilized Humanity", driveId: "16mXdPaMygOUk-vvPB2DvLTkhDtJt-xqR", type: "drive-pptx", session: "5", xp: 10 },
      { id: 6, title: "Session 6: The Unity of Indonesia", driveId: "189rFSLiZ0gpvcbcl50RkJHP4AveqfEIL", type: "drive-pptx", session: "6", xp: 10 },
      { id: 7, title: "Session 7: Pancasila Democracy", driveId: "1XZvDfNam_RR3uSw7HbGU-V8ly_wc7oA1", type: "drive-pptx", session: "7", xp: 10 },
      { id: 8, title: "Session 8: Culture Interaction", driveId: "1FmfXraBFAwWsl7Y83Th8m5kETwYyl2np", type: "drive-pptx", session: "8", xp: 10 },
      { id: 900, title: "Diktat CB Pancasila (Referensi Wajib)", driveId: "1iHgwqSn-ZiXqNppbB1LkWqaO_9_KLfTL", type: "drive-pdf", xp: 5, tab: "diktat" },
      { id: 901, title: "Soal CB Pancasila (File Ujian)", driveId: "1Kqtifr-6bQ4sRKxDz4dOIc7TbtEnSzMz", type: "drive-gdoc", xp: 5, tab: "soal" },
    ],
    kisiKisi: [],
    kisiKisiNote: "",
    flashcards: [],
    quiz: [],
  },
};

export function getContentBySubjectId(id: string): SubjectContent | undefined {
  return content[id];
}
