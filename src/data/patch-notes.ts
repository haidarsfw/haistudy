/**
 * Patch notes / changelog — authored in-repo, surfaced automatically.
 *
 * On a new release: bump APP_VERSION in src/lib/constants.ts and add a new entry
 * at the TOP here (newest first). The patch-notes popup (shown once after a user
 * refreshes into the new version) and the "Update aplikasi" section in the
 * notification bell both read from this list. The content never disappears, so
 * the notification tab is never empty.
 *
 * Copy rules: simple, friendly, non-technical Indonesian. The goal is that a
 * student just knows what changed, not a technical changelog. No em-dashes.
 *
 * Keep PATCH_NOTES[0].version in sync with APP_VERSION.
 */

export interface PatchNote {
  /** Semver string, e.g. "2.0.1". Must match APP_VERSION for the top entry. */
  version: string;
  /** ISO date, e.g. "2026-06-19". */
  date: string;
  /** Short, friendly headline. */
  title: string;
  /** A few simple bullet points of what changed / what is new. */
  items: string[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "2.3.0",
    date: "2026-06-21",
    title: "Layar hasil baru, scratchpad lebih enak, & banyak perbaikan",
    items: [
      "Layar hasil latihan dirombak: skor dan tombol nempel di atas, bisa lompat antar pembahasan, urut rapi dari soal nomor 1, plus filter Benar / Sebagian / Salah.",
      "Area coret-coret (scratchpad) bisa diatur ukuran dari segala sisi, dipindah bebas, dan posisinya diingat saat dibuka lagi.",
      "Cheat sheet lebih enak dibaca: rumus tampil rapi dan ruang lebih lega.",
      "Tab 'Hafalan & Kuis' kini bernama 'Drill', dan deretan tab di HP lebih ringkas.",
      "Belajar Kilat dan briefing ujian tampil lebih pas di layar besar.",
      "Notifikasi DM tampil lebih rapi di lonceng, dan titik merahnya muncul lebih cepat.",
      "Pusat notifikasi ditata ulang: notifikasi utama di atas, Update Aplikasi di bawah dan bisa dibuka 'lihat lebih banyak'.",
      "Pemutar musik makin mulus: langsung jalan saat diputar dan judul panjang berjalan otomatis.",
      "Saat sedang mengerjakan ujian, sesi tidak akan keluar sendiri.",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-06-21",
    title: "Update besar: Latihan Soal lengkap + perbaikan platform",
    items: [
      "Latihan Soal makin lengkap: tambahan mata kuliah, area coret-coret (scratchpad), kalkulator, dan cheat sheet di dalam ujian.",
      "Penilaian AI lebih akurat: semua soal kini dinilai penuh, plus tombol Nilai Ulang di layar hasil.",
      "Pembahasan lebih enak dibaca: daftar isi yang bisa diklik dan filter Salah/Sebagian.",
      "Foto profil kamu kini tampil di mana saja: daftar mulai chat baru, DM, dan daftar online.",
      "Daftar online jadi real-time, muncul tanpa perlu refresh.",
      "Notifikasi DM lebih jelas: titik merah di ikon chat dan di tab sumbernya.",
      "Pemutar musik diperbaiki: judul lagu tampil dan langsung jalan saat diputar.",
      "Flashcards dan Quiz digabung jadi satu tab Hafalan & Kuis biar lebih rapi.",
      "Atur ulang foto profil dengan crop yang bisa digeser bebas.",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-06-20",
    title: "Latihan Soal Ujian (Practice Exam)",
    items: [
      "Fitur Latihan Soal baru: Simulasi ujian dengan durasi waktu nyata dan evaluasi AI.",
      "Pembahasan Soal Lengkap: Dapatkan kunci jawaban, rubrik penilaian, dan feedback AI dalam bahasa Indonesia.",
      "Hapus Riwayat Latihan: Sekarang kamu bisa menghapus riwayat pengerjaan latihan soal.",
      "Mode Imersif: Tampilan ujian layar penuh tanpa gangguan menu navigasi utama.",
      "Bebas Keluar Ujian: Kamu bisa keluar gratis dalam 30 detik pertama tanpa memotong kuota latihan.",
      "Tombol Back & Coba Lagi yang responsif sebelum dan sesudah ujian.",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-06-19",
    title: "Notifikasi chat + musik yang lebih enak",
    items: [
      "Ada notifikasi kalau kamu dapat DM atau pesan chat baru, plus tanda merah di ikon chat.",
      "Pemutar musik lebih cepat dimuat dan lagunya nggak ke-skip sendiri lagi.",
      "Belajar Kilat: tombol Tanya AI lebih jelas, dan bisa mulai obrolan baru biar nggak campur.",
      "Buka DM jadi lebih cepat.",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-06-16",
    title: "Belajar Kilat, AI di tiap kartu, & musik",
    items: [
      "Belajar Kilat: belajar lewat kartu yang tinggal digeser, plus haistudy AI di tiap kartu.",
      "Pemutar musik bisa pakai playlist SoundCloud kamu sendiri, lengkap dengan tombol previous/next dan progress bar yang bisa digeser.",
      "Bahasa materi di Belajar Kilat dibikin lebih gampang dipahami.",
    ],
  },
];
