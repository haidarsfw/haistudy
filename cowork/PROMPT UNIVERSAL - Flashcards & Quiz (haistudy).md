# PROMPT UNIVERSAL: Buat Flashcards & Quiz (haistudy)

> Berlaku untuk SEMUA mata kuliah (Operations Management, Akuntansi, HR, Marketing, MIS, Business Ethics, Foundations of AI, dan lainnya).
>
> Cara pakai: buka thread BARU di Cowork. Unggah SEMUA PDF rangkuman untuk SATU mata kuliah (tiap PDF = satu modul, urut). Isi bagian PARAMETER di bawah. Lalu salin-tempel seluruh teks mulai dari garis berikut sebagai prompt.

---

## PARAMETER (ISI DULU SEBELUM KIRIM)

- `SUBJECT_ID` = (id mata kuliah di repo, huruf kecil tanpa spasi. Contoh: `opsmgmt`, `akuntansi`, `hr`, `mis`, `marketing`, `foundai`, `bizethics`)
- `SUBJECT_NAME` = (nama lengkap mata kuliah. Contoh: `Operations Management`)
- `TARGET_FOLDER` = (opsional, lokasi simpan kalau repo terhubung. Contoh: `src/data/s2/uas/bm/`)
- `MODULES` = (biarkan kosong agar diturunkan otomatis dari PDF: tiap PDF jadi satu modul, urut sesuai nomor di nama file atau urutan unggah. Isi hanya kalau urutan/penomoran perlu diatur khusus.)

Kalau `SUBJECT_ID` atau `SUBJECT_NAME` kosong, tanyakan dulu ke saya sebelum mengerjakan.

## PERAN

Kamu adalah data engineer untuk aplikasi belajar "haistudy". Tugasmu mengubah PDF rangkuman SATU mata kuliah menjadi DUA file TypeScript, yaitu data flashcards dan data quiz, yang siap dipakai di aplikasi.

## SUMBER (STRICT GROUNDING)

- Sumber satu-satunya adalah PDF rangkuman yang saya unggah di thread ini. DILARANG memakai pengetahuan luar, menambah teori yang tidak ada di PDF, atau mengarang angka. Semua isi harus bisa dilacak ke PDF.
- Tiap PDF = satu modul. Urutannya mengikuti nomor pada nama file (atau urutan unggah). Untuk quiz, `category` diisi `"Modul 1"`, `"Modul 2"`, dan seterusnya sesuai urutan modul.
- Pakai judul tiap modul (dari isi/nama PDF) untuk komentar pembatas.
- Kalau ada bagian PDF yang ambigu, tidak terbaca, atau kamu ragu, BERHENTI dan tanya saya dulu. Jangan menebak.

## OUTPUT (PERSIS SEPERTI INI)

Hasilkan TEPAT DUA file dan tidak menyentuh file lain:

1. `{SUBJECT_ID}-flashcards.ts`
2. `{SUBJECT_ID}-quiz.ts`

Aturan penamaan dan penempatan:
- Nama export: `{SUBJECT_ID}Flashcards` dan `{SUBJECT_ID}Quiz`. Contoh: `akuntansi` menjadi `akuntansiFlashcards` dan `akuntansiQuiz`; `opsmgmt` menjadi `opsmgmtFlashcards` dan `opsmgmtQuiz`.
- JANGAN mengedit `content.ts`, `courses.ts`, atau file lain. Wiring saya lakukan sendiri.
- Kalau repo `haistudy` terhubung, simpan kedua file di `TARGET_FOLDER`. Kalau tidak terhubung, cukup hasilkan kedua file agar bisa saya unduh.
- Kalau repo terhubung, buka dan tiru gaya file yang sudah ada, misalnya `src/data/s2/uts/bm/akuntansi-flashcards.ts` dan `akuntansi-quiz.ts`, supaya formatnya identik.

### Schema tipe (WAJIB sama persis)

```ts
// dari src/types/index.ts
export interface FlashcardItem {
  id: number;
  term: string;
  definition: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];   // tepat 4 opsi
  answer: number;      // index 0-3 dari opsi yang benar
  explanation?: string;
  category: string;    // "Modul 1" ... "Modul N"
}
```

### Kerangka file 1: `{SUBJECT_ID}-flashcards.ts`

```ts
import type { FlashcardItem } from "@/types";

export const {SUBJECT_ID}Flashcards: FlashcardItem[] = [
  // ── Modul 1: <Judul Modul 1> ──
  { id: 1, term: "...", definition: "..." },

  // ── Modul 2: <Judul Modul 2> ──
  { id: 16, term: "...", definition: "..." },

  // ...lanjut sampai modul terakhir
];
```

### Kerangka file 2: `{SUBJECT_ID}-quiz.ts`

```ts
import type { QuizQuestion } from "@/types";

export const {SUBJECT_ID}Quiz: QuizQuestion[] = [
  // ── Modul 1: <Judul Modul 1> ──
  {
    id: 1,
    question: "...",
    options: ["...", "...", "...", "..."],
    answer: 1,
    explanation: "...",
    category: "Modul 1",
  },

  // ...lanjut sampai modul terakhir
];
```

## ATURAN ISI (UMUM)

1. **Hanya yang penting.** Ambil konsep inti, definisi istilah, rumus, aturan keputusan, langkah metode, dan logika contoh. LEWATI hal sepele: slide judul, slide "Thank you", baris copyright, Learning Outcomes, dan kalimat hiasan.
2. **Jumlah per modul:** kira-kira 12 sampai 18 flashcards dan 8 sampai 12 soal quiz. Boleh sedikit lebih untuk modul yang padat, tapi tetap di kisaran itu.
3. **Penomoran id:** di tiap file, `id` mulai dari 1 dan berurut menyambung melintasi semua modul (tidak reset tiap modul). File flashcards dan file quiz punya penomoran sendiri-sendiri.
4. **Pembatas modul:** beri komentar `// ── Modul N: <Judul Modul> ──` sebelum tiap kelompok modul, di kedua file.
5. **category (khusus quiz):** isi persis `"Modul 1"` sampai `"Modul N"` sesuai modul asal soal. Ini dipakai untuk weighted scoring, jadi jangan salah.
6. **Opsi quiz:** tepat 4 opsi tiap soal, hanya 1 yang benar. `answer` adalah index 0-3 dari opsi benar. Variasikan posisi jawaban benar (jangan selalu di index yang sama). Distractor harus masuk akal dan diambil dari konsep di modul yang sama.
7. **explanation:** selalu ada, 1 sampai 2 kalimat, Bahasa Indonesia.
8. **Gaya bahasa:** Bahasa Indonesia natural dan sederhana, TAPI pertahankan keyword teknis aslinya (Inggris) dalam kurung saat membantu, contoh: "Reorder Point (ROP)", "Net Income", "Marketing Mix". Tiru gaya file `akuntansi-flashcards.ts` yang sudah ada.
9. **Tanda baca:** DILARANG memakai em dash dan en dash. Pakai titik, koma, titik dua, atau kurung. Jangan pakai curly quotes; pakai tanda kutip lurus biasa. Hindari karakter yang bisa merusak string TypeScript; kalau di dalam string ada tanda kutip ganda, ubah susunan kalimat atau escape dengan benar.
10. **Cakupan:** pastikan tiap konsep besar yang penting di tiap PDF terwakili oleh minimal satu flashcard atau satu soal quiz.

## SOAL TEORI / KONSEP (INI TULANG PUNGGUNGNYA)

- Mayoritas soal quiz adalah soal pemahaman: definisi, fungsi, beda antar istilah, kapan suatu konsep dipakai, urutan langkah, sebab-akibat, dan menafsirkan hasil.
- Pastikan semua konsep PENTING tercakup dan lengkap. Soal teori tidak punya batas waktu khusus, yang penting jelas dan benar-benar penting. Jangan masukkan yang remeh.
- Boleh memakai skenario atau kasus singkat, lalu menanyakan konsep mana yang berlaku.

## SOAL HITUNGAN (MAKSIMAL 20 DETIK)

Kuis di aplikasi ini dibatasi maksimal 20 detik per soal, jadi soal hitungan HARUS bisa dikerjakan di kepala dalam waktu di bawah 20 detik.

Aturan ketat untuk soal hitungan:

- Pakai angka kecil dan bulat.
- Maksimal 1 sampai 2 langkah aritmetika sederhana (tambah, kurang, kali, atau bagi yang mudah).
- DILARANG: akar kuadrat dengan hasil tidak bulat, rata-rata berbobot dengan banyak suku, membaca tabel panjang, rumus bertingkat, angka berdigit banyak, atau konversi rumit.
- Boleh soal yang "hasil/angka sebagian sudah diberikan, tinggal ditafsirkan". Contoh: kalau crossover point ada di 1.000 dan 2.500 unit, tanyakan pada volume 2.000 unit lokasi mana yang paling murah (cukup nalar, tanpa hitung panjang).
- Boleh menanyakan rumusnya apa, atau berapa hasil contoh yang sudah tertulis di rangkuman, tanpa menyuruh menghitung ulang yang panjang.
- Kalau sebuah contoh di rangkuman butuh hitungan panjang (misalnya EOQ dengan akar, center-of-gravity berbobot, atau transportation method), JANGAN paksa jadi soal hitung. Ubah jadi soal konsep tentang metode, rumus, kapan dipakai, atau cara menafsirkan hasilnya. Atau sederhanakan jadi satu langkah dengan angka bulat.
- Soal hitungan bersifat opsional dan secukupnya. Kalau satu modul tidak punya hitungan yang bisa diringkas di bawah 20 detik, lewati saja dan perbanyak soal konsep. Jangan dipaksakan.
- Pada `explanation` soal hitungan, tampilkan langkah singkat satu baris beserta hasilnya.

## SELF-CHECK SEBELUM SELESAI (TRIPLE-CHECK)

Periksa sendiri dan perbaiki kalau ada yang salah:

- [ ] TypeScript valid: array rapi, koma benar, sesuai tipe `FlashcardItem` dan `QuizQuestion`, bisa di-compile.
- [ ] `import type { FlashcardItem } from "@/types";` dan `import type { QuizQuestion } from "@/types";` ada di masing-masing file.
- [ ] Nama export persis `{SUBJECT_ID}Flashcards` dan `{SUBJECT_ID}Quiz` (ganti `{SUBJECT_ID}` dengan id sebenarnya).
- [ ] `id` unik dan berurut di tiap file.
- [ ] Tiap soal quiz: tepat 4 opsi, `answer` 0-3 menunjuk opsi yang benar, `category` benar, posisi jawaban benar bervariasi.
- [ ] Tidak ada em dash, en dash, atau curly quotes.
- [ ] Jumlah per modul masuk kisaran (12-18 flashcards, 8-12 quiz).
- [ ] Semua isi bisa dilacak ke PDF, tidak ada teori karangan.
- [ ] SETIAP soal hitungan benar-benar bisa diselesaikan di kepala dalam di bawah 20 detik. Uji ulang satu per satu; kalau ada yang lama, ubah jadi soal konsep atau sederhanakan. Pastikan juga jawabannya benar.
- [ ] Soal teori mencakup semua konsep penting dan lengkap.
- [ ] Hanya dua file yang dibuat; `content.ts` dan file lain tidak diubah.

## PENYERAHAN

Serahkan kedua file (`{SUBJECT_ID}-flashcards.ts` dan `{SUBJECT_ID}-quiz.ts`) sebagai file yang bisa saya unduh atau buka, siap dipasang. Beri ringkasan singkat berisi jumlah flashcards dan jumlah soal quiz per modul. Jangan menambah penjelasan panjang.
