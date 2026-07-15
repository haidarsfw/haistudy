// Landing social-proof testimonials — VERBATIM from the post-UTS/UAS feedback
// sheets (BINUS Business Management). Quotes are word-for-word as written by the
// students; only the positive, product-focused responses are featured here. Do
// not paraphrase — if a quote must change, re-pull it from the source sheet.

export interface Testimonial {
  name: string;
  /** Class code (e.g. "LE86"). Optional — some sheet rows had no class column. */
  kelas?: string;
  campus: "BINUS" | "UNJ";
  quote: string;
}

/** Headline satisfaction rating (avg satisfaction across the sheets → /5). */
export const TESTIMONIAL_RATING = { value: 4.8, outOf: 5 } as const;

export const TESTIMONIAL_CAMPUSES = ["BINUS"] as const;

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Reia Avrileamori",
    kelas: "LB86",
    campus: "BINUS",
    quote:
      "ngebantu bgtt, yg Belajar Kilat oke bgt soalnya gue suka mager baca materi banyak atoga kalo lg mau yg cepet paham aja, yg Latihan Soal juga bagus bgt soalnya jd kebayang soal ujian nanti gimana dan bisa simulasi dulu sblm ujian beneran",
  },
  {
    name: "Rheindra Prama Maulana Hanif",
    kelas: "LE86",
    campus: "BINUS",
    quote:
      "menurut gua, haistudy udah kaya satu tempat belajar yang nyatuin banyak hal jadinya lebih enak belajarnya. mulai dari rangkumannya lengkap, kisi-kisi, kalo ada update disampein di chat, latsol dll lengkap deh pokoknya. ai nya juga ngebantu gua buat jelasin semua nya supaya lebih jelas dan ringkas lagi. love haistudy 🫰🏻",
  },
  {
    name: "Cindy Baby Gracia Kustiawan Adinata",
    kelas: "LC86",
    campus: "BINUS",
    quote:
      "makasii banyak yaa haidar udah buat app ini, jujur terbantu bangett sihh karna lengkap bangettt. aku juga udah promoin ke temen temen akuu. semoga ajaa ini ada teruss sampaiii ujian terakhir nanti thank youuu 😭🙏🏻",
  },
  {
    name: "Jeremiah Axel Tjio",
    campus: "BINUS",
    quote:
      "great work untuk kamu ka, aku apresiasi untuk website haistudy ini karena jujur ngebantu banget aku ga usah repot2 bikin rangkuman + ada belajar kilat dan quiz yang bs ngerefresh memori pembelajarannya gitu sih ka. pesanku sehat2 trus ka 🤗🤗",
  },
  {
    name: "Queeny Sansiviera",
    kelas: "LE86",
    campus: "BINUS",
    quote:
      "TERIMAKASIH sudah menciptakan haistudy, aku doa in developer haistudy masuk surga soalnya ngebantu bangeetttt, sukses terus haistudyyyy semoga bisa ditemenin haistudy sampai lulus 🫰🏻",
  },
  {
    name: "Wanda Puspitasari",
    campus: "BINUS",
    quote:
      "suka bgt bgt hehehe, jujur kaget haistudy ada buat uas, krn pernah denger haistudy udah ga ada lagi, dan pas uas ini ada aku langsung belii. helpful bgt bgtt buat yg malas bikin catatan pas lagi kelas. fiturnya juga oke sihh.",
  },
  {
    name: "Dafi Ardian Pasha",
    kelas: "LE86",
    campus: "BINUS",
    quote:
      "Jujur Haistudy membantu bgt boss dalam memahami materi matkul mungkin kalo ga ada haistudy gua kewalahan sih jujurrr, thank you bgt Haistudy 🫶",
  },
  {
    name: "Kheisya Aulia Zein",
    campus: "BINUS",
    quote:
      "kerenn bangett jujur bisa buat histudy dengan fitur yang superr lengkapp, bener bener ngebantu banget buat belajar dan pahamin materi 🫰🏻",
  },
  {
    name: "Putra Febrianto Setyawan",
    kelas: "LE86",
    campus: "BINUS",
    quote:
      "mahalin harganya, berguna bgt. orng lain jual 20k percatetan. ini 30ribu udh semua.",
  },
  {
    name: "Marchia Khansa Balqis",
    kelas: "LJ21",
    campus: "BINUS",
    quote:
      "ide nya keren banget! sudah sangat bagus, sangat membantu untuk persiapan ujian walaupun beda prodi tapi tetap sama isinya. pls adain lagi buat uas 😁",
  },
  {
    name: "Evellyn Andina Tugiannoor",
    kelas: "LA86",
    campus: "BINUS",
    quote: "Sangat membantu dan up to date dgn bahan bahan Ujian",
  },
  {
    name: "Nafrizqa Intan Anggraini",
    campus: "BINUS",
    quote:
      "app nya sudah sangat baik dan membantu saat ujian semoga kedepannya bisa lebih baik dan berkembang lagi",
  },
  {
    name: "Tellyana Bella Savina",
    kelas: "LB30",
    campus: "BINUS",
    quote:
      "Materi lengkap menurut saya dan sangat terarah untuk belajar sangat membantu dehhh",
  },
];
