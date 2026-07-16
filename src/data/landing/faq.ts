// Landing FAQ — single source of truth. Rendered by <Faq> (client accordion)
// and also emitted as FAQPage JSON-LD in page.tsx (server) for rich results.
// Copy is account-based (no license-key language) and gen-z casual ID.

export interface FaqItem {
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    q: "Apa itu haistudy?",
    a: "Platform belajar buat mahasiswa. Semua yang kamu butuhin buat siapin ujian ada di satu tempat: materi tiap mata kuliah, rangkuman, latihan soal, flashcard, mode Belajar Kilat, AI yang siap bantu 24/7, sampai komunitas buat belajar bareng.",
  },
  {
    q: "haistudy cocok buat siapa?",
    a: "Mulai dari mahasiswa BINUS Business Management, dan sekarang haistudy lagi ekspansi ke makin banyak jurusan dan kampus lain. Materinya disusun ngikutin mata kuliah dan periode ujian kamu, jadi yang kamu pelajarin beneran nyambung sama yang keluar di ujian.",
  },
  {
    q: "Gimana cara dapat aksesnya?",
    a: "Pilih paket di halaman ini, isi formulir pembelian, bayar lewat transfer bank, e-wallet, atau QRIS, terus unggah bukti bayarnya. Admin bakal verifikasi dan langsung ngaktifin akun kamu. Habis itu tinggal login.",
  },
  {
    q: "Bedanya tiap paket apa?",
    a: "Isi materinya sama buat semua paket. Share paling murah tapi kamu diminta share haistudy ke temen dulu. Normal langsung akses tanpa syarat. VIP nambah beberapa fitur dan kenyamanan ekstra kayak AI prioritas, kustomisasi tampilan, dan perk lainnya. Diamond buat yang mau dukung haistudy lebih sambil dapetin semua fitur VIP.",
  },
  {
    q: "Berapa lama aksesnya berlaku?",
    a: "Akses berlaku buat satu periode ujian yang kamu beli, misalnya UAS Semester 2. Jadi kamu bisa pakai semua materinya sampai ujian itu kelar.",
  },
  {
    q: "Bisa dipakai di berapa device?",
    a: "Paket Share dan Normal bisa dipakai di 2 device, sedangkan VIP dan Diamond bisa sampai 3 device.",
  },
  {
    q: "Bisa coba dulu sebelum beli?",
    a: 'Bisa banget. Klik tombol "Preview Gratis" buat lihat-lihat demo platformnya tanpa perlu login atau bayar dulu.',
  },
  {
    q: "Gimana kalau ada kendala pembayaran atau akses?",
    a: "Langsung chat admin lewat WhatsApp aja ya. Kirim detail kendalanya, nanti kita bantu cek dan beresin secepatnya.",
  },
];
