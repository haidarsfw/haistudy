# haistudy — Launch Checklist

Panduan tes & ops sebelum buka ke umum. Centang tiap item. Login pakai **license key asli** (bukan preview).

> Status keamanan & fitur inti: **sudah live & terverifikasi di prod** (RLS lockdown, JWT-realtime, IDOR fix, OG image, perf index). Yang di bawah ini = hal runtime yang hanya bisa kamu tes manual + ops gratisan.

---

## A. Checklist Manual (tes sendiri)

### A1. Alur beli paket + email invoice 🛒 (PALING PENTING)
- [ ] Buka haistudy.site (Incognito, bukan preview) → pilih paket → isi form (nama, WA, **email kamu sendiri**, paket, periode, upload bukti bayar) → submit.
- [ ] Email invoice "Pesanan diterima" masuk ke email pembeli — **cek INBOX & SPAM**.
- [ ] Email admin (`ADMIN_ALERT_EMAIL`) dapat notif "Pembelian baru".
- [ ] `haistudy.site/admin` → tab **Pembelian/Purchase** → order muncul.
- [ ] Klik **Approve** → license key ter-generate → kirim ke WA pembeli (manual).

**Kalau email tak masuk / masuk spam → kerjakan A2.**

### A2. Verifikasi domain di Resend 📧 (biar email tidak masuk spam)
- [ ] Login resend.com → **Domains** → cek `haistudy.site` = **Verified**.
- [ ] Kalau belum: **Add Domain** `haistudy.site` → salin semua DNS record (SPF/DKIM/DMARC) ke DNS provider domain → klik **Verify** (tunggu propagasi 5–60 mnt).
- [ ] Pastikan env `EMAIL_FROM` = `noreply@haistudy.site`.

### A3. Aturan login-method (round-8 — belum pernah dites) 🔑
- [ ] Key metode "key" → login ketik key → **bisa**.
- [ ] Key metode "email/Google" → login Google email cocok → **bisa**.
- [ ] Key "email-only" dipakai login ketik key → **ditolak**.
- [ ] Login Google email **tidak cocok** dengan key → **ditolak**.

### A4. Login Google (OAuth) 🔓
- [ ] Klik "Lanjut dengan Google" di prod → balik ke app dalam keadaan login.
- [ ] Kalau `redirect_uri_mismatch`: Google Cloud Console → OAuth client → Authorized redirect URIs → tambah `https://haistudy.site/auth/callback`.

### A5. AI Chat 🤖
- [ ] Kirim pertanyaan → dapat jawaban beneran (BUKAN "mode demo").
- [ ] Kirim gambar → dijawab (Gemini).
- [ ] Kalau "mode demo": set `DEEPSEEK_API_KEY` / `GEMINI_API_KEY` di Vercel.

### A6. Voice Room 🎙️
- [ ] Join room → izinkan mic → connect & kelihatan peserta.
- [ ] Kalau gagal: cek `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`.

### A7. Push Notification (HP asli) 🔔
- [ ] Di HP (Chrome Android) → login → Settings → aktifkan notifikasi → izinkan.
- [ ] Picu notif (mis. pesan support masuk) → notif muncul di HP.
- [ ] Kalau gagal: cek `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

### A8. Mobile + Admin scope 📱
- [ ] Buka di HP asli: login, dashboard, subject, quiz, chat → rapi, tak kepotong.
- [ ] Login admin → ganti scope (s1/s2 × uts/uas) → konten berubah sesuai scope.

### A9. Realtime (sudah dites jalan, recheck cepat) ⚡
- [ ] 2 tab/akun → kirim chat di satu → muncul otomatis di tab lain tanpa refresh.

---

## B. Ops $0 — cron gratis (notify-email + anti-pause Supabase) ⏰

**Kenapa:** email digest support tak jalan otomatis di Vercel Hobby; Supabase gratis auto-tidur kalau 7 hari idle. Satu cron eksternal menyelesaikan keduanya.

**Ambil `CRON_SECRET`:** Vercel → project → Settings → Environment Variables → `CRON_SECRET` → Reveal → copy.

- [ ] cron-job.org → Sign up (gratis) → login.
- [ ] **Create cronjob**:
  - **Title:** `haistudy notify-email`
  - **URL:** `https://haistudy.site/api/cron/notify-email`
  - **Schedule:** Every 5 minutes
  - **Request method:** GET
  - **Headers → Add:** Key `Authorization`, Value `Bearer <CRON_SECRET>` (ada spasi setelah `Bearer`)
- [ ] **Test run** → harus **HTTP 200** (kalau 401 = header salah).
- [ ] Cek dashboard cron-job.org: job hijau/sukses tiap 5 menit.

> Catatan: route ini sempat 500 (bug embed) — **sudah diperbaiki** (commit `c8c2686`). Setelah deploy, test run = 200.

---

## C. Risiko & catatan

- [ ] ⚠️ **Vercel Hobby = non-komersial**, kamu jual akses → risiko ToS suspend. Keputusan: terima / upgrade Pro $20 / pindah host (Cloudflare/Netlify/Render).
- [ ] Konten `s2/uts/bm:cbkwn` & `s1/uts/bm:pancasila` nyaris kosong → **launch apa adanya** (sudah dipilih). Isi nanti kalau mau.
- [ ] `src/proxy.ts` sempat ada perubahan lokal yang belum di-commit — **sudah di-commit** (allowlist OG). Tak ada yang tertinggal.
- [ ] (Opsional) a11y kontras halaman login (skor 85): butuh daftar audit Lighthouse spesifik biar aman (tak ubah warna global).

---

*Dibuat otomatis dari audit pra-rilis. Detail teknis lengkap ada di plan file `~/.claude/plans/saya-mau-rilis-website-foamy-beaver.md`.*
