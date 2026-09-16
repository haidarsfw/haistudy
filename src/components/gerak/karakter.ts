import type { TargetAndTransition, Transition, Variants } from "framer-motion";

/**
 * Tiga karakter gerak, untuk dipilih satu.
 *
 * Semuanya memakai aturan yang sama seperti `src/lib/motion.ts`:
 * transform + opacity saja (tidak pernah memicu layout), dan keluar selalu
 * lebih cepat daripada masuk. Yang berbeda cuma WATAK-nya — seberapa jauh
 * benda bergerak, seberapa lama, dan apakah dia melewati tujuannya sedikit
 * sebelum menetap.
 */

export type KunciKarakter = "halus" | "pegas" | "cepat";

export type Karakter = {
  kunci: KunciKarakter;
  nama: string;
  sifat: string;
  /** Kalimat yang menjelaskan rasanya, bukan angkanya. */
  rasa: string;
  angka: string;
  /** Popup: muncul & hilang. */
  popup: Variants;
  /** Latar gelap di belakang popup. */
  tirai: Variants;
  /** Panel tab / langkah wisaya, sadar arah lewat `custom`. */
  panel: (jarak: number) => Variants;
  /** Penanda yang meluncur di bawah tab aktif. */
  penanda: Transition;
  /** Kartu saat disentuh kursor. */
  hoverKartu: TargetAndTransition;
  /** Tombol saat ditekan. */
  tekan: TargetAndTransition;
  /** Tombol saat disentuh kursor. */
  hoverTombol: TargetAndTransition;
  /** Satu baris daftar yang datang berurutan. */
  baris: Variants;
  /** Jeda antar baris. */
  jedaBaris: number;
  /** Notifikasi yang menyelinap dari pinggir. */
  toast: Variants;
  /** Panel yang membuka ke bawah (disclosure). */
  buka: Transition;
};

const MASUK = [0.16, 1, 0.3, 1] as const;
const KELUAR = [0.4, 0, 1, 1] as const;
const TAJAM = [0.2, 0.8, 0.2, 1] as const;

// ── A · HALUS ──────────────────────────────────────────────────────────────
// Tidak ada yang memantul. Semua melambat sampai berhenti, tidak pernah
// melewati tujuannya. Jarak tempuhnya pendek, jadi yang terasa itu
// pergantiannya, bukan geraknya.
const halus: Karakter = {
  kunci: "halus",
  nama: "Halus",
  sifat: "Tenang · tidak memantul",
  rasa: "Barangnya menyatu masuk. Kamu sadar layarnya berganti, tapi tidak melihat ada yang terbang.",
  angka: "masuk 240ms · keluar 140ms · tanpa pegas",
  popup: {
    hidden: { opacity: 0, scale: 0.97, y: 6 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.24, ease: MASUK } },
    exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: 0.14, ease: KELUAR } },
  },
  tirai: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.24, ease: MASUK } },
    exit: { opacity: 0, transition: { duration: 0.14, ease: KELUAR } },
  },
  panel: (jarak) => ({
    hidden: (arah: number) => ({ opacity: 0, x: jarak * (arah || 1) }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.24, ease: MASUK } },
    exit: (arah: number) => ({ opacity: 0, x: -jarak * (arah || 1), transition: { duration: 0.14, ease: KELUAR } }),
  }),
  penanda: { duration: 0.26, ease: MASUK },
  hoverKartu: { y: -2, transition: { duration: 0.22, ease: MASUK } },
  tekan: { scale: 0.985 },
  hoverTombol: { scale: 1.012, transition: { duration: 0.2, ease: MASUK } },
  baris: {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: MASUK } },
  },
  jedaBaris: 0.045,
  toast: {
    hidden: { opacity: 0, y: -10, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: MASUK } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.14, ease: KELUAR } },
  },
  buka: { duration: 0.26, ease: MASUK },
};

// ── B · PEGAS ──────────────────────────────────────────────────────────────
// Semuanya digantung pada pegas, jadi tidak ada yang berhenti mendadak —
// benda menetap. Redamannya sengaja tinggi supaya "hidup", bukan "mental".
const pegas: Karakter = {
  kunci: "pegas",
  nama: "Pegas",
  sifat: "Hidup · menetap, bukan berhenti",
  rasa: "Barangnya seperti punya berat. Datang cepat, lalu mendarat dan diam sendiri.",
  angka: "pegas stiffness 420 · damping 30 · keluar 130ms",
  popup: {
    hidden: { opacity: 0, scale: 0.94, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 30, mass: 0.9 } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.13, ease: KELUAR } },
  },
  tirai: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2, ease: MASUK } },
    exit: { opacity: 0, transition: { duration: 0.13, ease: KELUAR } },
  },
  panel: (jarak) => ({
    hidden: (arah: number) => ({ opacity: 0, x: jarak * 1.3 * (arah || 1) }),
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 400, damping: 34, mass: 0.8 } },
    exit: (arah: number) => ({ opacity: 0, x: -jarak * (arah || 1), transition: { duration: 0.13, ease: KELUAR } }),
  }),
  penanda: { type: "spring", stiffness: 400, damping: 28 },
  hoverKartu: { y: -4, transition: { type: "spring", stiffness: 340, damping: 22 } },
  tekan: { scale: 0.96 },
  hoverTombol: { scale: 1.03, transition: { type: "spring", stiffness: 420, damping: 20 } },
  baris: {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 28 } },
  },
  jedaBaris: 0.055,
  toast: {
    hidden: { opacity: 0, y: -22, scale: 0.9 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 24 } },
    exit: { opacity: 0, x: 60, transition: { duration: 0.15, ease: KELUAR } },
  },
  buka: { type: "spring", stiffness: 380, damping: 32 },
};

// ── C · CEPAT ──────────────────────────────────────────────────────────────
// Waktunya dipangkas habis, jaraknya justru ditambah. Hasilnya terbaca sebagai
// alat yang gesit: belum sempat kamu perhatikan, sudah selesai.
const cepat: Karakter = {
  kunci: "cepat",
  nama: "Cepat",
  sifat: "Gesit · jarak jauh, waktu pendek",
  rasa: "Nyaris tidak ada yang perlu ditunggu. Cocok untuk barang yang dipakai berjam-jam.",
  angka: "masuk 150ms · keluar 90ms · kurva tajam",
  popup: {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: TAJAM } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.09, ease: KELUAR } },
  },
  tirai: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.12, ease: TAJAM } },
    exit: { opacity: 0, transition: { duration: 0.09, ease: KELUAR } },
  },
  panel: (jarak) => ({
    hidden: (arah: number) => ({ opacity: 0, x: jarak * 1.6 * (arah || 1) }),
    visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: TAJAM } },
    exit: (arah: number) => ({ opacity: 0, x: -jarak * 1.6 * (arah || 1), transition: { duration: 0.09, ease: KELUAR } }),
  }),
  penanda: { duration: 0.16, ease: TAJAM },
  hoverKartu: { y: -3, transition: { duration: 0.12, ease: TAJAM } },
  tekan: { scale: 0.97 },
  hoverTombol: { scale: 1.02, transition: { duration: 0.12, ease: TAJAM } },
  baris: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: TAJAM } },
  },
  jedaBaris: 0.03,
  toast: {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: TAJAM } },
    exit: { opacity: 0, x: 40, transition: { duration: 0.09, ease: KELUAR } },
  },
  buka: { duration: 0.17, ease: TAJAM },
};

export const KARAKTER: Record<KunciKarakter, Karakter> = { halus, pegas, cepat };
export const URUTAN: KunciKarakter[] = ["halus", "pegas", "cepat"];
