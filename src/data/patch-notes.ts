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
