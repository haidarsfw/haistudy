// The full "& masih banyak lagi" list — every core feature a buyer gets, well
// beyond the generalised lines on a card. Shown in a popup so it reveals what
// ISN'T already on the front, not a repeat of it.
//
// Lives here rather than inside a component because BOTH the landing pricing
// section and the /payments package step show it, and they must not drift into
// two different answers to "what do I actually get".

export interface FeatureGroup {
  group: string;
  items: string[];
}

export const ALL_FEATURES: FeatureGroup[] = [
  {
    group: "Materi & belajar",
    items: [
      "Rangkuman lengkap tiap mata kuliah",
      "Belajar Kilat (mode swipe)",
      "Latihan Soal esai & PG + koreksi AI",
      "3x kuota simulasi ujian",
      "Quiz & flashcards interaktif",
    ],
  },
  {
    group: "AI",
    items: [
      "haistudy AI 24/7 (tanya materi apa aja)",
      "AI dilatih materi resmi, ga halusinasi",
    ],
  },
  {
    group: "Komunitas",
    items: [
      "Forum & chat kelas",
      "Voice room belajar bareng",
      "Pengumuman & kisi-kisi real-time",
    ],
  },
  {
    group: "Produktivitas",
    items: [
      "Jadwal kuliah + countdown ujian",
      "Alat fokus (pomodoro + reminder)",
      "Statistik belajar",
      "Bookmark & catatan cepat",
    ],
  },
  {
    group: "Personalisasi",
    items: ["Tema, warna & font", "Musik lofi + playlist sendiri"],
  },
];
