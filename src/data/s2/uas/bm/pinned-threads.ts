import type { ForumThread } from "@/types";

// Admin-curated threads injected at the top of a subject's forum.
// These are code-seeded (not stored in Supabase), so they never receive
// comments and are read-only. Use deterministic IDs with a `pinned-` prefix
// to avoid collisions with Supabase UUIDs.

export const PINNED_THREADS: Record<string, ForumThread[]> = {
  akuntansi: [
    {
      id: "pinned-akuntansi-uas-modul-v1",
      subjectId: "akuntansi",
      title: "UAS Akuntansi - Modul Belajar Interaktif (HTML)",
      content: [
        "Halaman HTML interaktif berisi rangkuman lengkap materi UAS Accounting for Business sesuai kisi-kisi: CVP (Cost-Volume-Profit), Incremental Analysis, dan Master Budget untuk bagian Case, plus Managerial Accounting (Sesi 15-16) dan Budgetary Control (Sesi 25-26) untuk bagian Essay.",
        "",
        "Isi modul:",
        "• Kisi-kisi UAS di bagian atas",
        "• Bagian Case (60%): CVP, Incremental Analysis, Master Budget",
        "• Bagian Essay (40%): Managerial Accounting, Budgetary Control",
        "• Referensi: kumpulan semua rumus + istilah & kata kunci",
        "• Latihan soal per teori lengkap dengan pembahasan",
        "• Dark / Light mode (tap toggle di pojok)",
        "• Sudah mobile compatible - responsive di HP",
        "",
        "CATATAN PENTING - BACA DULU:",
        "File ini harus dibuka di BROWSER (Chrome, Safari, Firefox, Edge) supaya semua fitur interaktif (accordion, navigasi, dark mode, tabel) bisa jalan normal.",
        "",
        "Kalau setelah di-download kamu cuma lihat tampilan teks polos lewat preview (misalnya preview Files iOS, preview Google Drive, atau preview Gmail), itu BUKAN rusak - kamu cuma perlu buka via browser:",
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
          url: "/downloads/uas_akuntansi_final.html",
          label: "UAS Akuntansi - Modul Belajar Interaktif",
        },
      ],
      closed: true,
      commentCount: 0,
      createdAt: new Date("2026-06-27T00:00:00Z").toISOString(),
      isPinned: true,
    },
  ],
};

export function getPinnedThreads(subjectId: string): ForumThread[] {
  return PINNED_THREADS[subjectId] ?? [];
}
