# Contoh Hasil (Modul 1 saja) untuk Menimbang Prompt

Ini contoh keluaran yang akan dihasilkan prompt, dibatasi Modul 1 (Location Strategies) saja, supaya Anda bisa menilai gaya, format, dan tingkat detailnya. Contoh ini memakai PROMPT UNIVERSAL dengan SUBJECT_ID = `opsmgmt`, dan semua soal hitungannya sudah dipastikan bisa dikerjakan di bawah 20 detik. Versi penuh nanti berisi Modul 1 sampai 6 dalam dua file `.ts` terpisah.

---

## File 1: `opsmgmt-flashcards.ts` (potongan Modul 1)

```ts
import type { FlashcardItem } from "@/types";

export const opsmgmtFlashcards: FlashcardItem[] = [
  // ── Modul 1: Location Strategies ──
  { id: 1, term: "Tujuan Location Strategy", definition: "Membuat manfaat lokasi sebesar mungkin bagi perusahaan. Lokasi berpengaruh besar pada fixed cost dan variable cost." },
  { id: 2, term: "Sifat Keputusan Lokasi", definition: "Keputusan jangka panjang (long-term) yang jarang diambil. Begitu perusahaan menetap, banyak biaya dan sumber daya sudah terlanjur dan sulit diubah." },
  { id: 3, term: "Tiga Pilihan Saat Butuh Lokasi", definition: "Memperluas fasilitas yang ada (expanding), mempertahankan yang lama sambil menambah lokasi baru (add sites), atau menutup yang lama lalu pindah (relocating)." },
  { id: 4, term: "Key Success Factors (KSFs)", definition: "Faktor-faktor kunci yang menentukan berhasil tidaknya sebuah lokasi." },
  { id: 5, term: "Drivers of Globalization", definition: "Pendorong globalisasi: market economics, communication, transportasi cepat dan andal, mudahnya aliran modal (capital flow), dan perbedaan biaya tenaga kerja." },
  { id: 6, term: "Country Decision (KSF)", definition: "Pertimbangan tingkat negara: risiko politik dan aturan pemerintah, isu budaya dan ekonomi, letak pasar, tenaga kerja, ketersediaan pasokan, serta nilai tukar dan risiko mata uang." },
  { id: 7, term: "Region/Community Decision (KSF)", definition: "Pertimbangan tingkat wilayah: daya tarik wilayah, biaya dan ketersediaan tenaga kerja serta utilitas, aturan lingkungan, insentif pemerintah, kedekatan bahan baku dan pelanggan, dan biaya tanah." },
  { id: 8, term: "Site Decision (KSF)", definition: "Pertimbangan tingkat lokasi persis: ukuran dan biaya lahan, akses transportasi, zoning restrictions, kedekatan jasa atau pasokan, dampak lingkungan, serta kepadatan dan jenis pelanggan." },
  { id: 9, term: "Labor Cost per Unit", definition: "Biaya tenaga kerja per hari dibagi produktivitas (unit per hari). Upah murah belum tentu murah per unit kalau produktivitasnya rendah." },
  { id: 10, term: "Operational Hedging", definition: "Memindahkan produksi mengikuti perubahan nilai tukar untuk meredam risiko mata uang (exchange rates and currency risks)." },
  { id: 11, term: "Tangible vs Intangible Cost", definition: "Tangible cost gampang diukur (utilitas, tenaga kerja, bahan, pajak). Intangible cost susah diangkakan (pendidikan, transportasi umum, komunitas, quality-of-life)." },
  { id: 12, term: "Clustering", definition: "Berkumpulnya perusahaan sejenis di satu area (proximity to competitors), didorong sumber daya seperti bahan alam, informasi, modal, dan tenaga ahli." },
  { id: 13, term: "Factor-Rating Method", definition: "Metode menilai lokasi dengan memberi bobot (weight) dan nilai (score) pada banyak faktor, lalu memilih total tertinggi. Enam langkah dari menyusun KSF sampai memberi rekomendasi." },
  { id: 14, term: "Locational Cost-Volume Analysis", definition: "Membandingkan lokasi lewat rumus Total Cost = Fixed Cost + (Variable Cost x Volume), lalu memilih biaya terendah untuk volume yang diperkirakan." },
  { id: 15, term: "Crossover Point", definition: "Volume saat dua lokasi punya total biaya yang sama. Titik ini menentukan rentang volume di mana tiap lokasi paling murah." },
  { id: 16, term: "Center-of-Gravity Method", definition: "Mencari lokasi distribution center yang meminimalkan biaya distribusi. Koordinatnya = jumlah (koordinat x kuantitas) dibagi jumlah kuantitas." },
  { id: 17, term: "Transportation Model", definition: "Menentukan jumlah kiriman dari beberapa titik supply ke beberapa titik demand agar total biaya produksi dan pengiriman minimal. Termasuk bagian dari linear programming." },

  // ── Modul 2 sampai Modul 6 menyusul di file penuh ──
];
```

---

## File 2: `opsmgmt-quiz.ts` (potongan Modul 1)

```ts
import type { QuizQuestion } from "@/types";

export const opsmgmtQuiz: QuizQuestion[] = [
  // ── Modul 1: Location Strategies ──
  {
    id: 1,
    question: "Tujuan utama dari location strategy adalah...",
    options: [
      "Menambah jumlah pesaing di sekitar perusahaan.",
      "Menurunkan kualitas produk demi menekan biaya.",
      "Memaksimalkan manfaat lokasi bagi perusahaan.",
      "Menghindari semua bentuk pajak daerah.",
    ],
    answer: 2,
    explanation: "Tujuan location strategy adalah membuat manfaat lokasi sebesar mungkin bagi perusahaan, karena lokasi sangat memengaruhi fixed cost dan variable cost.",
    category: "Modul 1",
  },
  {
    id: 2,
    question: "Mengapa keputusan lokasi digolongkan sebagai keputusan jangka panjang (long-term)?",
    options: [
      "Karena begitu perusahaan menetap, banyak biaya dan sumber daya sudah terlanjur dan sulit diubah.",
      "Karena lokasi bisa diganti setiap bulan tanpa biaya.",
      "Karena lokasi tidak berpengaruh pada biaya apa pun.",
      "Karena keputusannya hanya diambil oleh karyawan baru.",
    ],
    answer: 0,
    explanation: "Lokasi bersifat long-term karena setelah perusahaan berkomitmen, biaya dan sumber daya yang terkait sulit untuk diubah lagi.",
    category: "Modul 1",
  },
  {
    id: 3,
    question: "Di South Carolina, upah $70 per hari menghasilkan 60 unit. Di Mexico, upah $25 per hari menghasilkan 20 unit. Lokasi mana yang biaya tenaga kerja per unitnya lebih murah?",
    options: [
      "Mexico, karena upah hariannya paling rendah.",
      "South Carolina, karena $1,17 per unit lebih murah dari $1,25 per unit.",
      "Keduanya sama, yaitu $1,20 per unit.",
      "Tidak bisa dihitung tanpa data harga jual.",
    ],
    answer: 1,
    explanation: "Labor cost per unit = biaya per hari dibagi produktivitas. South Carolina $70/60 = $1,17 dan Mexico $25/20 = $1,25, jadi South Carolina lebih murah meski upahnya lebih tinggi.",
    category: "Modul 1",
  },
  {
    id: 4,
    question: "Athens punya fixed cost $30.000 dan variable cost $75 per unit, Brussels fixed cost $60.000 dan variable cost $45 per unit. Pada volume berapa total biaya keduanya sama (crossover point)?",
    options: [
      "500 unit",
      "750 unit",
      "1.000 unit",
      "2.500 unit",
    ],
    answer: 2,
    explanation: "30.000 + 75x = 60.000 + 45x, sehingga 30x = 30.000 dan x = 1.000 unit.",
    category: "Modul 1",
  },
  {
    id: 5,
    question: "Crossover point Athens-Brussels ada di 1.000 unit dan Brussels-Lisbon ada di 2.500 unit. Untuk volume 2.000 unit, lokasi mana yang paling murah?",
    options: [
      "Athens",
      "Brussels",
      "Lisbon",
      "Tergantung harga jual",
    ],
    answer: 1,
    explanation: "Volume 2.000 berada di rentang 1.000 sampai 2.500, dan di rentang itu Brussels yang paling murah.",
    category: "Modul 1",
  },
  {
    id: 6,
    question: "Center-of-Gravity Method dipakai untuk...",
    options: [
      "Menentukan urutan pengerjaan job di mesin.",
      "Mencari lokasi distribution center yang meminimalkan biaya distribusi.",
      "Menilai lokasi dengan memberi bobot pada banyak faktor.",
      "Membandingkan fixed cost dan variable cost antar kota.",
    ],
    answer: 1,
    explanation: "Center-of-Gravity Method mencari lokasi distribution center yang membuat biaya distribusi paling kecil, dengan mempertimbangkan letak pasar dan jumlah barang yang dikirim.",
    category: "Modul 1",
  },
  {
    id: 7,
    question: "Pada factor-rating, France memperoleh total weighted score 70,35 dan Denmark 68,00. Lokasi mana yang direkomendasikan?",
    options: [
      "France, karena total nilainya paling tinggi.",
      "Denmark, karena total nilainya lebih rendah.",
      "Keduanya, karena selisihnya kecil.",
      "Tidak ada, karena nilai harus di bawah 50.",
    ],
    answer: 0,
    explanation: "Aturan factor-rating adalah memilih lokasi dengan total nilai tertinggi, yaitu France (70,35).",
    category: "Modul 1",
  },
  {
    id: 8,
    question: "Berkumpulnya banyak perusahaan sejenis di satu area, yang didorong sumber daya seperti tenaga ahli dan modal, disebut...",
    options: [
      "Operational hedging",
      "Disaggregation",
      "Clustering",
      "Backordering",
    ],
    answer: 2,
    explanation: "Clustering adalah kedekatan dengan pesaing (proximity to competitors), sering didorong oleh sumber daya seperti bahan alam, informasi, modal, dan tenaga ahli.",
    category: "Modul 1",
  },
  {
    id: 9,
    question: "Berikut yang termasuk intangible cost dalam keputusan lokasi adalah...",
    options: [
      "Biaya utilitas",
      "Upah tenaga kerja",
      "Pajak",
      "Quality-of-life dan pendidikan",
    ],
    answer: 3,
    explanation: "Intangible cost adalah biaya yang susah diangkakan, seperti pendidikan, transportasi umum, kondisi komunitas, dan quality-of-life. Utilitas, upah, dan pajak termasuk tangible cost.",
    category: "Modul 1",
  },
  {
    id: 10,
    question: "Metode yang menentukan jumlah kiriman dari beberapa titik supply ke beberapa titik demand agar total biaya produksi dan pengiriman minimal adalah...",
    options: [
      "Factor-Rating Method",
      "Transportation Model",
      "Center-of-Gravity Method",
      "ABC Analysis",
    ],
    answer: 1,
    explanation: "Transportation Model mencari pola kiriman dari titik supply ke titik demand dengan total biaya minimal, dan merupakan bagian khusus dari linear programming.",
    category: "Modul 1",
  },

  // ── Modul 2 sampai Modul 6 menyusul di file penuh ──
];
```

---

Catatan: di contoh ini Modul 1 menghasilkan 17 flashcards dan 10 soal quiz (campuran konsep, hitungan ringan, dan skenario), dengan posisi jawaban benar yang bervariasi. Semua soal hitungan dijaga agar bisa dikerjakan di bawah 20 detik: yang butuh hitungan panjang (seperti koordinat center-of-gravity atau membandingkan total biaya tiga kota) sengaja diubah jadi soal konsep atau soal tafsir angka yang sudah jadi. Kalau format dan tingkat detailnya sudah pas, prompt universal tinggal dipakai untuk mata kuliah mana pun, satu mata kuliah per thread.
