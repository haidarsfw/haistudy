// Refund policy Q&A — rendered by <Faq items={REFUND_FAQ}> on /refund and also
// emitted as FAQPage JSON-LD there. Must stay consistent with the Ketentuan
// Layanan (/terms § 3: purchases are final) — the exceptions below are the
// narrow, agreed carve-outs, not a general money-back guarantee.

import type { FaqItem } from "@/data/landing/faq";

export const REFUND_FAQ: FaqItem[] = [
  {
    q: "Pembelian haistudy bisa direfund gak?",
    a: "Secara umum pembelian bersifat final. Alasannya sederhana: haistudy itu produk digital, begitu aksesnya aktif kamu langsung bisa buka semua materi, latihan soal, dan AI-nya. Tapi ada beberapa kondisi yang uangnya tetap kita balikin, ada di pertanyaan bawah.",
  },
  {
    q: "Kondisi apa aja yang uangnya dibalikin?",
    a: "Ada tiga. Pertama, kamu bayar dobel atau nominalnya kelebihan, selisihnya kita balikin. Kedua, pembayaran kamu udah masuk tapi aksesnya gak pernah aktif dan gak bisa kita benerin, uangnya balik penuh. Ketiga, haistudy error parah sampai kamu gak bisa pakai sama sekali selama periode ujian kamu, uangnya juga balik penuh.",
  },
  {
    q: "Gimana kalau salah beli paket?",
    a: "Gak perlu refund, tinggal chat admin aja. Kalau kamu mau naik paket, kamu cukup bayar selisihnya. Kalau turun paket, selisihnya yang kita balikin ke kamu. Paketnya kita pindahin langsung, akses kamu gak keganggu.",
  },
  {
    q: "Kondisi apa yang gak bisa direfund?",
    a: "Kalau kamu berubah pikiran atau ternyata gak sempat pakai, itu gak bisa direfund ya. Sama kalau akses kamu diblokir karena melanggar ketentuan, misalnya akunnya dibagikan ke orang lain. Gangguan kecil yang masih bisa kita beresin juga gak masuk refund, itu kita benerin aja langsung.",
  },
  {
    q: "Gimana cara ngajuinnya?",
    a: "Chat admin lewat WhatsApp, terus kirim nama kamu, email yang dipakai daftar, bukti transfer, dan cerita singkat kendalanya. Makin lengkap datanya, makin cepat kita proses.",
  },
  {
    q: "Berapa lama prosesnya?",
    a: "Setelah datanya lengkap, kita cek dan proses maksimal 1x24 jam. Dananya balik ke rekening atau e-wallet yang sama kayak yang kamu pakai buat bayar. Gak ada batas waktu buat ngajuin, selama kamu masih bisa nunjukin bukti bayarnya.",
  },
];
