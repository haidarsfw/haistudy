# AUDIT REVERT — Apa yang Hilang Setelah Kembali ke Versi Bersih

**Tanggal:** 2026-05-29
**Versi bersih (tujuan revert):** `main` = commit `28c57ce`
**Versi batch (yang dibuang dari layar, tapi DISIMPAN aman):** branch `recovery-2026-05-28` = commit `925f2de` + `stash@{0}`

> Ringkasan satu kalimat: versi bersih `28c57ce` sudah berisi SEMUA kerja besar sebelumnya (multi-scope `/s2/uas/bm`, Google login, polish harga/teks, perbaikan PageSpeed). Yang dibuang HANYA "batch 17 polish" terakhir yang bikin website terasa buggy. Total perbedaan: **242 file, +9.290 baris, −1.443 baris.**

> **Tidak ada satu baris pun yang hilang permanen.** Semua tersimpan di branch `recovery-2026-05-28` (commit `925f2de`) dan di `stash@{0}`. Kapan saja bisa dilihat lagi dengan:
> - Lihat 1 file: `git show recovery-2026-05-28:<path-file>`
> - Ambil 1 file ke versi bersih: `git checkout recovery-2026-05-28 -- <path-file>`
> - Lihat seluruh perbedaan: `git diff 28c57ce 925f2de`

---

## CARA BACA DAFTAR INI

Tiap fitur di bawah = sesuatu yang **ADA di versi batch** tapi **TIDAK ADA di versi bersih**. Jadi setelah revert, semua ini **hilang dari website** dan harus kamu putuskan: mana yang mau di-implement ulang (dengan benar, tidak buggy), mana yang dibuang selamanya.

Kolom "File" = bukti tempat kode itu berada, biar tidak ada yang ketinggalan.

---

## A. DATABASE — 7 migrasi baru (025–031)

> CATATAN PENTING: 7 migrasi ini **sudah terlanjur dijalankan di Supabase remote**. Revert kode TIDAK menghapus kolom/tabel ini dari database. Jadi setelah revert, di DB masih ada kolom-kolom "yatim" (avatar_url, bio, custom_accent, channel, highlights, dll) + tabel `snippet_library`, `dm_conversations`, `dm_messages`. **Ini AMAN** — kode versi bersih tidak memakainya, tidak error. Hanya "nganggur". Kalau mau benar-benar bersih bisa dibuat migrasi penghapus nanti, tapi tidak wajib.

| Migrasi | Menambah apa | Dipakai fitur |
|---|---|---|
| `025_custom_accent.sql` | kolom `user_settings.custom_accent` (warna HSL) | Warna aksen custom VIP |
| `026_user_profiles_customization.sql` | kolom `avatar_url`, `bio`, `custom_status`, `custom_status_emoji` di `user_profiles` | Profil + avatar + status |
| `027_user_highlights.sql` | kolom `user_settings.highlights` | Highlight rangkuman tersimpan |
| `028_snippet_library.sql` | tabel `snippet_library` | Library snippet VIP |
| `029_chat_channels.sql` | kolom `chat_messages.channel` (global / vip-lounge) | Chat dipisah channel |
| `030_dm_chat.sql` | tabel `dm_conversations` + `dm_messages` | DM (pesan pribadi) |
| `031_remove_chat_stickers.sql` | hapus tipe pesan "sticker" | Stiker dihapus |

---

## B. FITUR YANG HILANG (per kelompok)

### 1. Modal Install PWA (pasang aplikasi)
Modal "pasang aplikasi" yang muncul tengah layar setelah login, bisa di-dismiss, muncul lagi hanya kalau versi SW naik. Tombol Install juga di Settings.
- File: `src/components/system/install-banner.tsx` (BARU), `src/lib/pwa-version.ts` (BARU, `SW_VERSION="v2"`), `src/components/settings/settings-modal.tsx`, `public/sw.js`, `public/manifest.json`

### 2. Banner "Update tersedia"
Banner atas layar saat ada versi baru, klik untuk refresh, toast "Berhasil diupdate". Tidak auto-reload (biar draft chat/AI tidak hilang).
- File: `src/components/system/update-banner.tsx` (BARU), `src/hooks/use-version-check.ts`

### 3. AI — model jujur + tooltip + rename otomatis + rename manual + export
- Tooltip mode fast/reasoning menampilkan model sebenarnya (free = Gemini 2.5 Flash, VIP/admin = DeepSeek).
- Judul percakapan AI **auto-rename** dari pesan pertama (via Gemini Flash).
- **Rename manual** judul percakapan (ikon pensil).
- **Export** percakapan AI ke Markdown.
- Limit jumlah percakapan per tier (free 3, VIP/admin 10).
- File: `src/components/ai/ai-input.tsx`, `src/app/api/ai/chat/route.ts`, `src/app/api/ai/rename/route.ts` (BARU), `src/app/api/ai/conversations/[id]/export/route.ts` (BARU), `src/app/api/ai/conversations/route.ts`, `src/hooks/use-ai-chat.ts`, `src/hooks/use-ai-chat-history.ts`, `src/components/ai/ai-chat-panel.tsx`, `src/lib/ai-limits.ts` (BARU), `src/lib/ai/context.ts`

### 4. Larangan tanda em-dash (—)
Script cek otomatis supaya tidak ada karakter "—" di kode/konten, plus instruksi AI agar tidak memakainya.
- File: `scripts/check-no-emdash.mjs` (BARU), banyak file data materi dirapikan, `src/app/api/ai/chat/route.ts`

### 5. Warna aksen custom + tema + font VIP
- VIP/admin bisa pilih warna aksen sendiri (color picker HSL), tersimpan dan bertahan setelah reload.
- Picker tema & font diperluas; font premium VIP (Lora, JetBrains, Quicksand, Merriweather) di-load lazy supaya tidak memberatkan user gratis.
- File: `src/components/providers/theme-provider.tsx`, `src/components/settings/theme-picker.tsx`, `src/components/settings/font-picker.tsx`, `src/lib/lazy-fonts.ts` (BARU), `src/hooks/use-settings.ts`, `src/app/globals.css`, migrasi `025`

### 6 & 8. Profil publik + bio + avatar
- Edit bio, status custom, emoji status; upload avatar (Cloudinary) atau avatar default huruf-awal (SVG, tanpa biaya jaringan).
- Halaman/endpoint profil publik user lain.
- File: `src/components/settings/profile-editor.tsx` (BARU), `src/hooks/use-profile.ts`, `src/lib/avatar.ts` (BARU), `src/app/api/profile/route.ts`, `src/app/api/profile/public/route.ts` (BARU), `src/components/user/user-profile-popover.tsx`, migrasi `026`

### 7. i18n EN/ID lengkap
Terjemahan Inggris/Indonesia disinkronkan penuh (+387 baris di tiap file) + script cek simetri. Toggle EN/ID mengganti semua menu/toast; materi tetap Indonesia.
- File: `src/lib/i18n/en.ts`, `src/lib/i18n/id.ts`, `scripts/check-i18n-symmetry.mjs` (BARU)

### 9. Chat panel lebih lebar + tab emoji dihapus
- File: `src/components/chat/chat-panel.tsx`, `src/components/chat/message-input.tsx`

### 10a. Chat dipisah channel (global vs VIP lounge)
Chat punya channel `global` (semua) dan `vip-lounge` (VIP/admin saja).
- File: `src/app/api/chat/messages/route.ts`, `src/hooks/use-chat.ts`, migrasi `029`

### 10b. DM (pesan pribadi) + direktori user offline
- DM 1:1 untuk VIP/admin; tab DM baru; picker user yang menampilkan VIP+admin **online maupun offline**, bisa dicari.
- File: `src/components/chat/dm-tab.tsx` (BARU), `src/components/chat/dm-user-picker.tsx` (BARU), `src/hooks/use-dm-chat.ts` (BARU), `src/lib/dm.ts` (BARU), `src/app/api/dm/users/route.ts` (BARU), `src/app/api/dm/conversations/route.ts` (BARU), `src/app/api/dm/conversations/[id]/messages/route.ts` (BARU), migrasi `030`

### 11. Rangkuman — highlight + anti-copy + placeholder + library snippet
- Highlight teks rangkuman (5 warna), tersimpan, bisa dibuka lagi.
- Simpan highlight ke **Library snippet** (khusus VIP) + halaman Library.
- Anti-copy untuk non-admin (blok copy/cut/klik-kanan/Ctrl+C/X/S/P) dengan toast; admin bebas.
- Placeholder rangkuman saat modul kosong.
- File: `src/components/subject/rangkuman-tab.tsx`, `src/components/subject/highlight-tooltip.tsx` (BARU), `src/hooks/use-highlights.ts` (BARU), `src/data/rangkuman-placeholder.ts` (BARU), `src/app/(scoped)/[semester]/[exam]/[jurusan]/library/page.tsx` (BARU), `src/app/api/snippets/route.ts` (BARU), `src/app/api/snippets/[id]/route.ts` (BARU), migrasi `027` + `028`

### 12 & 17. Voice — VIP Lounge + perbaikan spam konsol
- Room "VIP Lounge" tampil di atas; user gratis lihat tapi klik → toast "khusus VIP" (tidak join, konsol bersih); VIP/admin bisa join.
- Penolakan "VIP only" tidak lagi `console.error`.
- File: `src/app/api/voice/rooms/route.ts`, `src/components/voice/room-card.tsx`, `src/hooks/use-voice-room.ts`, `src/components/voice/voice-panel.tsx`, `src/components/voice/voice-room.tsx`, `src/app/api/voice/token/route.ts`

### 13. Stiker chat dihapus
Tipe pesan "sticker" dibuang; kirim text/image/audio tetap jalan.
- File: migrasi `031`, `src/components/chat/message-input.tsx`

### 14. Toast sambutan VIP online
Saat user VIP online, user lain dapat toast kecil bermahkota (sekali per sesi). User gratis tidak memicu; user yang sembunyikan status tidak broadcast.
- File: `src/components/system/vip-welcome-listener.tsx` (BARU), `src/hooks/use-online-users.ts`

### 15. Badge VIP di chat
Badge tier (VIP/admin) tampil di gelembung pesan chat.
- File: `src/components/chat/message-list.tsx`, `src/components/chat/chat-panel.tsx`, dan helper `src/lib/tier.ts` (BARU)

### 16. Helper tier terpusat
`src/lib/tier.ts` (BARU) — fungsi `isVipTier()` / `canUseVipFeatures()` dipakai semua fitur VIP di atas.

### (Tambahan) SEO
- `robots.txt`, `sitemap.xml`, JSON-LD structured data, perbaikan OG image.
- File: `src/app/robots.ts` (BARU), `src/app/sitemap.ts` (BARU), `src/components/seo/json-ld.tsx` (BARU), `src/app/opengraph-image.tsx`, `src/app/layout.tsx`

---

## C. CATATAN FILE BANYAK YANG "M" (modified)

Selain file BARU di atas, ada ~180 file lama yang ikut diubah (admin panel, support chat, dashboard, hooks). Sebagian besar perubahan kecil itu adalah:
1. Penambahan key i18n (toast/teks → pakai `t("...")`).
2. Integrasi helper `tier.ts` / avatar / channel.
3. Penyesuaian agar fitur baru di atas nyambung.

Setelah revert, semua kembali ke bentuk `28c57ce`. Daftar lengkap 242 file ada di: `git diff --name-status 28c57ce 925f2de`.

---

## D. REKOMENDASI URUTAN IMPLEMENT ULANG (kalau nanti mau)

Saran prioritas bila ingin pasang lagi satu-satu **dengan pengetesan tiap langkah** (biar tidak buggy lagi):
1. Helper dasar dulu: `tier.ts`, `avatar.ts` (tanpa UI, aman).
2. SEO (robots/sitemap/json-ld) — murni tambahan, tidak ganggu UX.
3. i18n symmetry — aman, hanya teks.
4. Profil + avatar (butuh migrasi 026 — sudah ada di DB).
5. Warna aksen + font VIP (migrasi 025 — sudah ada).
6. AI rename/export/limit.
7. Rangkuman highlight + library (migrasi 027/028 — sudah ada).
8. Chat channel + VIP lounge + badge (migrasi 029 — sudah ada).
9. DM (migrasi 030 — sudah ada).
10. PWA modal + update banner (paling akhir, paling rawan ganggu UX).

Tiap langkah: pasang → `npx tsc --noEmit` → `npm run build` → tes di browser → baru lanjut.
