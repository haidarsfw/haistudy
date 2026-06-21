# Latihan Soal — Manual Test Checklist

Checklist tes manual untuk fitur **Latihan Soal** (AI-graded practice exam) + fitur/perbaikan terkait. Dibuat 2026-06-21.

## Cara menjalankan
- `npm run dev`, login, lalu buka tab **Latihan Soal** di tiap mata kuliah:
  - `/s2/uas/bm/subject/foundai` — Foundations of AI (True/False + studi kasus)
  - `/s2/uas/bm/subject/akuntansi` — Accounting (tabel + rumus + kalkulator)
  - `/s2/uas/bm/subject/opsmgmt` — Operations Management (tabel + rumus + kalkulator + cheat sheet)
  - `/s2/uas/bm/subject/bizethics` — Business Ethics (baseline lama)
- Uji di **desktop** dan **mobile** (lebar ~390px). Untuk PWA: install dulu (Add to Home Screen).
- Legenda: ⭐ = kritis (wajib lolos sebelum rilis).

---

## 1. Grading & auto-submit (kritis)
- [ ] ⭐ Submit ujian normal (manual) → AI menilai, skor **TIDAK 0**, tanpa error 404.
- [ ] ⭐ First-submit andal: kerjakan ujian penuh dengan jawaban panjang (mis. Accounting/Ops Mgmt) → submit → skor masuk benar (uji grader robust, bukan fallback 0).
- [ ] ⭐ Auto-submit waktu habis: set/biarkan timer sampai 0 → **auto-submit sekali**, dinilai, **tanpa loop**, tanpa 404, jawaban tetap utuh.
- [ ] Submit gagal sementara (mis. matikan internet sebentar lalu submit) → ada layar error "Gagal mengumpulkan" + tombol "Coba lagi"; retry berhasil setelah internet kembali.
- [ ] Jawaban kosong/sebagian → skor 0 untuk yang kosong, parsial untuk yang sebagian (tidak crash).

## 2. Resume / safety net refresh (kritis)
- [ ] ⭐ Mulai ujian → isi beberapa jawaban → **refresh halaman** → otomatis balik ke ujian yang sama (jawaban + sisa waktu utuh).
- [ ] ⭐ Resume **tidak** mengurangi kuota percobaan (cek angka kuota sebelum vs sesudah refresh).
- [ ] Refresh tepat setelah klik "Mulai" (sebelum 5 detik) → tetap bisa resume (sesi ditulis saat start).
- [ ] Resume saat waktu sudah habis: refresh setelah durasi lewat → otomatis dikumpulkan & dinilai (bukan hilang).
- [ ] Tutup ujian via tombol X (keluar) → buka `/latihan` lagi → mulai dari **briefing** (bukan auto-resume); sesi sudah bersih.
- [ ] Submit selesai → buka `/latihan` lagi → mulai dari briefing (sesi bersih).
- [ ] Coretan scratchpad ikut ter-restore setelah refresh (buka scratchpad lagi → gambar masih ada).

## 3. Re-grade (halaman Riwayat)
- [ ] ⭐ Buka riwayat dengan skor 0 / belum dinilai → tombol **"Nilai Ulang Jawaban (AI)"** → loading → skor terupdate sesuai jawaban.
- [ ] Re-grade idempoten: klik nilai ulang lagi → tetap jalan, hasil wajar (tidak error).
- [ ] Re-grade **tidak** memotong kuota percobaan.
- [ ] Re-grade gagal (matikan internet) → layar error + "Coba lagi"/"Kembali"; "Kembali" balik ke hasil sebelumnya, "Coba lagi" mengulang.
- [ ] Tidak ada payload debug bocor di Network response `/api/exam/regrade` (tidak ada `_debug`/`_rawAiText`).

## 4. Konten ujian per mata kuliah
- [ ] ⭐ FoundAI: Type I = 5 soal True/False dalam 1 halaman (toggle Benar/Salah + kotak alasan); Type II (Kasus 1 & 2) + Type III (Kasus 3) dengan anak soal a/b/c → submit → semua dinilai.
- [ ] Accounting: tabel (cost item, budget) + rumus tampil rapi; tiap esai/anak soal punya kotak jawaban terpisah (a/b/c).
- [ ] Ops Mgmt: tabel + rumus KaTeX (√, pecahan, Σ) tampil benar; ada tombol cheat sheet.
- [ ] bizethics (baseline): masih jalan normal (essay + case, satu kotak per soal).
- [ ] Format ujian tampil pakai **%** di briefing + launch card (FoundAI 25%/75%, Accounting & Ops 40%/60%, bizethics 40%/60%).
- [ ] Toggle bahasa EN/ID di header mengganti teks soal (kunci jawaban tetap ID).

## 5. Scratchpad (corat-coret) — semua matkul
- [ ] Buka via tombol pena di header (1-click).
- [ ] Mode **Float**: bisa digeser (drag header) + resize (pojok kanan bawah).
- [ ] Mode **Dock**: nempel kanan (desktop) bisa resize lebar; soal tetap kelihatan di kiri.
- [ ] Mode **Fullscreen**: layar penuh.
- [ ] Mobile: default dock bawah, bisa ditarik tinggi + ada toggle fullscreen.
- [ ] Pena (5 warna, 3 ketebalan), penghapus, undo/redo, bersihkan halaman.
- [ ] Multi-halaman: tambah, navigasi prev/next, **urutkan** (geser kiri/kanan), hapus halaman.
- [ ] Mode teks: ketuk kanvas → kotak teks, bisa digeser & dihapus.
- [ ] Jalan dengan mouse (desktop), jari (HP), dan stylus (iPad) bila ada.
- [ ] Coretan hilang setelah submit/keluar (bukan bocor ke attempt lain).

## 6. Kalkulator scientific — Accounting & Ops Mgmt saja
- [ ] Tombol kalkulator muncul di header **hanya** untuk akuntansi & opsmgmt (TIDAK di FoundAI/bizethics).
- [ ] 1-click buka; panel bisa digeser (drag header).
- [ ] Operasi benar: `2+3×4`=14, `2^10`=1024, `√(2×26.25×100000/1000)`≈72.46, `sin(30)` (mode DEG)=0.5, kurung `( )`, `π`, `±`, `%`.
- [ ] Toggle DEG/RAD bekerja (sin 30 beda hasil di DEG vs RAD).
- [ ] `C` clear, `⌫` hapus 1 karakter, `=` evaluasi; bisa lanjut hitung dari hasil.
- [ ] Tombol cukup besar & terbaca di mobile.

## 7. Cheat sheet — Operations Management saja
- [ ] Tombol cheat sheet muncul **hanya** di opsmgmt.
- [ ] View **Web** rapi (bukan chaotic): heading jelas, rumus KaTeX dalam blok, spasi nyaman, 5 tab lembar.
- [ ] Toggle **"PDF asli"** → tampil 5 lembar gambar PNG (format/warna asli PDF), bisa zoom in/out + navigasi prev/next.
- [ ] Navigasi 5 lembar konsisten antara mode Web & PDF.
- [ ] Bisa dibuka sambil mengerjakan soal (drawer kanan / fullscreen mobile).

## 8. Polish UX
- [ ] Tombol submit bertuliskan **"Kumpulkan"** (bukan "Kumpulkan Semua").
- [ ] Modal "Keluar Ujian?": **"Keluar" di kiri (sekunder)**, **"Lanjut Ujian" di kanan (utama/menonjol)**; klik backdrop = lanjut (tidak keluar).
- [ ] Label poin: desktop **"20 poin"/"20 points"** (ikut bahasa, subtle), mobile **"20p"**.
- [ ] Header ujian mobile (~390px): nama matkul **full** + semua alat (pena/kalkulator/cheat sheet/bahasa) tetap **1-click**, tidak sempit.
- [ ] Typography mobile nyaman (teks soal tidak kesempitan dibanding desktop).
- [ ] Copy/paste & select **diblok** di kotak jawaban + teks soal selama ujian (bukan di layar hasil/review).

## 9. Perbaikan aplikasi
- [ ] Console setelah login → dashboard: **tidak ada** `/api/presence` 401.
- [ ] Cek apakah error CSP `frame-ancestors` masih muncul setelah login; kalau ada, catat URL persisnya.
- [ ] Crop foto profil: di **desktop** (Settings → Profil → Upload) modal crop muncul; gambar bisa **digeser bebas** (atas/bawah/kiri/kanan), bukan cuma zoom.
- [ ] Crop foto di mobile tetap jalan + free-pan.
- [ ] Tombol **Muat Ulang**: muncul di sheet "Lainnya" **hanya** saat PWA terinstall (standalone); di browser biasa tidak ada; klik → reload.

## 10. Matriks lintas device (ulangi area kunci)
- [ ] Desktop (mouse): grading, scratchpad, kalkulator, cheat sheet, header.
- [ ] Mobile HP (~390px): header tidak sempit, scratchpad dock bawah, kalkulator muat, cheat sheet fullscreen, typography.
- [ ] iPad/tablet: scratchpad stylus, layout dock.
- [ ] PWA terinstall: tombol refresh, resume setelah keluar-masuk app.

---

### Catatan
- Gate otomatis sudah hijau: `tsc --noEmit` + `next build` + unit-test (kalkulator & grade parser) lolos.
- Belum di-commit; jalankan checklist ini sebelum commit/deploy.
