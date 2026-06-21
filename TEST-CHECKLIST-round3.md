# Test Checklist — Round 3 (post v2.2.0)

Satu alur, atas ke bawah, sekali jalan. Centang sambil jalan; catat apa pun yang ❌.

**Siapkan dulu**
- Login **s2 / UAS / BM** di desktop (ulang di 📱 mobile di titik bertanda).
- Punya **akun ke-2** (browser/HP lain) buat tes DM + online presence.
- Akun **admin** buat bagian admin.
- Dev only: tambah `?examMins=1` di URL Latihan Soal buat paksa timer 1 menit.

---

## 1. Login & sesi
- [ ] Login pakai **license key** → masuk normal.
- [ ] (kalau ada akun **Google**) login Google → masuk normal.

## 2. Dashboard — musik & online
- [ ] Diamkan ~3 detik, lalu buka player musik, pencet **Play** → **langsung jalan** (gak loading lama / nyangkut).
- [ ] Judul lagu panjang **jalan/berjalan (marquee)** di chip toolbar **dan** di panel "Sedang Diputar" — kebaca penuh, gak kepotong.
- [ ] Ganti next/prev/shuffle → musik tetap stabil.
- [ ] Kartu **ONLINE**: dirimu muncul. Login akun ke-2 di tempat lain → **muncul cepat** (beberapa detik) tanpa refresh. Logout akun ke-2 → **hilang** cepat.

## 3. Chat / DM (pakai akun ke-2; salah satunya VIP/admin)
- [ ] Kirim DM dari akun ke-2 (atau admin) ke akunmu.
- [ ] Tanpa buka chat: **angka merah** di ikon chat **nambah** (bukan cuma setelah dibuka).
- [ ] Buka chat → DM: **nama pengirim benar** (bukan "Pengguna"); kalau admin → ada **mahkota** + warna nama sesuai rank.
- [ ] Buka thread → bubble lawan bicara namanya benar juga.

## 4. Subject — tab & layout
Buka subject **s2/UAS/BM** mana saja.
- [ ] Tab gabungan namanya **"Drill"** (bukan "Hafalan & Kuis"); di dalamnya toggle Flashcards ↔ Quiz jalan.
- [ ] 📱 mobile: deret tab **rapi 2 baris**, isi selebar layar, gak ada celah kosong gede.
- [ ] **Belajar Kilat** (launch) di desktop: lebar penuh (gak kolom sempit + pinggir kosong), scroll lebih sedikit, daftar bab 2 kolom.

## 5. Latihan Soal — kuota
Buka subjek yang ada Latihan Soal (mis. **Ops Mgmt**).
- [ ] Kartu kuota nunjukin **sisa/total** sesuai tier baru (normal/share **3**, VIP **5**, diamond **10**, admin **∞**).
- [ ] Ada tombol **"Top-up kuota"** di kartu kuota.

## 6. Latihan Soal — kerjakan sekali penuh
- [ ] Start → layar penuh (briefing desktop lebih lebar, info 4 kolom, rules 2 kolom).
- [ ] Ketik **1 huruf** di satu jawaban → soal itu langsung kehitung **"dijawab"** (gak perlu panjang dulu).
- [ ] **Scratchpad** (pena):
  - [ ] Tarik **dari sisi/sudut mana pun** buat resize; tarik kanan = **membesar** (bukan mengecil).
  - [ ] Geser header buat **pindahin** window.
  - [ ] Pencet **Dock** → langsung nempel rapi (gak perlu tutup-buka dulu); soal bergeser, gak ketutup.
  - [ ] **Tutup** scratchpad, buka lagi → balik di **posisi & ukuran terakhir**.
  - [ ] Tombol pena di header: pencet lagi → **nutup** (toggle).
- [ ] **Kalkulator** + **scratchpad** + **cheat sheet** kebuka barengan → klik salah satu → yang diklik **naik ke depan**.
- [ ] **Cheat sheet** (buku): rumus **kebaca semua** (rumus dalam `$...$` muncul rapi via KaTeX, gak ada teks mentah `\frac`), spasi lega, drawer lebih lebar.
- [ ] **Esc** saat lagi ngetik di kolom jawaban → **nutup tool / buka konfirmasi keluar**, **BUKAN** lompat ke dashboard. Back browser → sama (konfirmasi, gak keluar).
- [ ] Jawab semua, **Kumpulkan** → kebaca semua, gak ada yang "tidak dinilai".

## 7. Hasil (results)
- [ ] **Bar atas nempel (sticky)**: skor ringkas + tombol **Kembali / Nilai Ulang / Coba Lagi** selalu kelihatan (gak perlu scroll jauh).
- [ ] Buka pembahasan: chip unit (1a/1b…) **lompat** ke pembahasannya.
- [ ] Filter **Semua / Benar / Sebagian / Salah** jalan.
- [ ] **Prev / Next** lompat antar pembahasan satu-satu.
- [ ] Pencet **Nilai Ulang (AI)** → ada loading sebентар → muncul **toast "Penilaian ulang selesai"**, skor keupdate (gak pindah layar).

## 8. Sesi tidak logout saat ujian (#15)
- [ ] Pas ngerjakan/abis ujian, **diamkan agak lama** (atau lama mikir) → **tidak** ke-logout "sesi berakhir" di tengah/abis ujian.
- [ ] (kalau login **Google**) di mana pun, diamkan lama → **tidak pernah** auto-logout.

## 9. Top-up kuota (beli kuota latihan)
- [ ] Habiskan kuota satu matkul (atau pencet **Top-up kuota**).
- [ ] Muncul modal: ada **3 paket** (1× Rp2.000, 3× Rp5.000, 7× Rp10.000), penjelasan santai soal biaya token AI, tujuan bayar (BCA/e-wallet/QRIS), upload bukti.
- [ ] Pilih paket → upload screenshot → **Kirim** → muncul layar **"Top-up terkirim!"**.

## 10. Admin
Login akun **admin**.
- [ ] **Purchase queue**: order top-up muncul (tertulis **"Top-up Kuota N× — <matkul>"** + harga). Pencet **Approve** → sukses (gak bikin key baru).
- [ ] Akun pembeli: kuota matkul itu **nambah** otomatis + dapat **notifikasi in-app** "Kuota latihan ditambahkan".
- [ ] **License keys → buka detail user**: bagian **Latihan Soal** nunjukin **nama matkul** (bukan id mentah), sisa kuota, attempt, nilai terbaik/terakhir.
- [ ] Di situ: tombol **Reset kuota** + **+/- bonus** jalan (sisa kuota berubah pas direfresh).

---

## Catatan
- **Online presence + DM red-dot + push** bergantung Realtime/push prod yang sudah aktif — verifikasi di live.
- `play.google.com/log … ERR_BLOCKED_BY_CLIENT` di console = telemetri viewer Google Drive/Slides keblok adblock. Pihak ketiga, gak ngaruh, abaikan.
- Migrasi DB **051_exam_quota** sudah diterapkan ke prod (tabel kuota + izin paket/notif top-up).

## Sign-off
- [ ] Semua ✅ → aman push live.
- [ ] Ada ❌ → kirim daftarnya, aku fix sebelum push.
