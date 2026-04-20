import type { ForumThread } from "@/types";

// Admin-curated threads injected at the top of a subject's forum.
// These are code-seeded (not stored in Supabase), so they never receive
// comments and are read-only. Use deterministic IDs with a `pinned-` prefix
// to avoid collisions with Supabase UUIDs.

export const PINNED_THREADS: Record<string, ForumThread[]> = {
  akuntansi: [
    {
      id: "pinned-akuntansi-uts-modul-v2",
      subjectId: "akuntansi",
      title: "UTS Akuntansi — Modul Belajar Interaktif (HTML)",
      content: [
        "Halaman HTML interaktif berisi rangkuman lengkap materi UTS Accounting for Business: konsep dasar, persamaan akuntansi, jurnal, laporan keuangan, sampai siklus akuntansi perusahaan jasa.",
        "",
        "CATATAN PENTING — BACA DULU:",
        "File ini harus dibuka di BROWSER (Chrome, Safari, Firefox, Edge) supaya semua fitur interaktif (accordion, navigasi, tabel) bisa jalan normal.",
        "",
        "Kalau setelah di-download kamu cuma lihat tampilan teks polos lewat preview (misalnya preview Files iOS, preview Google Drive, atau preview Gmail), itu BUKAN rusak — kamu cuma perlu buka via browser:",
        "• Android/iOS: tap file → pilih \"Open with...\" → pilih Chrome/Safari.",
        "• Desktop: klik kanan file .html → \"Open with\" → pilih browser.",
        "",
        "Cara pakai:",
        "1. Klik tombol \"Buka di Browser\" untuk langsung baca online.",
        "2. Klik tombol \"Download\" untuk simpan file offline supaya bisa dibuka tanpa internet.",
      ].join("\n"),
      authorId: "system-pinned",
      authorName: "Haidar",
      authorClass: "",
      isAdmin: true,
      isTester: false,
      packageTier: undefined,
      imageUrl: null,
      mediaUrl: null,
      attachments: [
        {
          type: "link",
          url: "/downloads/uts_akuntansi_v2.html",
          label: "UTS Akuntansi — Modul Belajar Interaktif",
        },
      ],
      closed: true,
      commentCount: 0,
      createdAt: new Date("2026-04-20T00:00:00Z").toISOString(),
      isPinned: true,
    },
  ],
};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
