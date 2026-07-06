import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy",
  description: "Kebijakan privasi haistudy: bagaimana data kamu dikelola.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:py-16 lg:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-6">Kebijakan Privasi</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Terakhir diperbarui: 6 Juli 2026
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 prose-headings:font-heading prose-headings:tracking-tight prose-li:my-0.5 text-sm text-foreground/80">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            1. Data yang Kami Simpan
          </h2>
          <p>Saat kamu memakai haistudy, kami menyimpan:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              Nama dan kelas kamu (ditampilkan di chat, forum, dan voice room).
            </li>
            <li>
              Perangkat yang kamu pakai untuk login, supaya jumlah perangkat bisa
              dibatasi (maksimal 2 per license key).
            </li>
            <li>
              Nomor HP atau email, kalau kamu memberikannya secara sukarela.
            </li>
            <li>
              Pengaturan kamu (tema, font, bahasa, pengingat belajar, dan status
              online).
            </li>
            <li>
              Progress belajar (materi yang sudah dibaca, flashcard selesai, skor
              quiz, dan streak).
            </li>
            <li>
              Pesan yang kamu kirim di chat, forum, pesan pribadi, dan layanan
              bantuan, termasuk gambar.
            </li>
            <li>
              Riwayat percakapan kamu dengan asisten AI, termasuk gambar yang
              kamu unggah.
            </li>
            <li>Jawaban, skor, dan riwayat Latihan Soal kamu.</li>
            <li>Catatan pribadi dan bookmark kamu.</li>
            <li>
              Kalau kamu login dengan Google, kami menerima email dan foto profil
              Google kamu.
            </li>
            <li>
              Data pembelian (nama, WhatsApp, dan email) saat kamu membeli akses.
            </li>
            <li>
              Notifikasi dan sedikit catatan aktivitas login untuk keamanan dan
              perbaikan bug.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            2. Untuk Apa Data Dipakai
          </h2>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Memastikan akun dan perangkat kamu.</li>
            <li>Menampilkan progress, statistik, dan streak belajar.</li>
            <li>Menjalankan fitur chat, forum, pesan pribadi, dan voice room.</li>
            <li>Menampilkan status online kamu ke pengguna lain.</li>
            <li>Menjalankan asisten belajar AI.</li>
            <li>
              Mengirim notifikasi yang relevan (mention, balasan, pengumuman)
              dan email seperti invoice pesanan.
            </li>
            <li>Menyinkronkan pengaturan dan data antar perangkat kamu.</li>
            <li>Menyelesaikan masalah lewat layanan bantuan.</li>
            <li>Memperbaiki bug dan meningkatkan kualitas platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            3. Di Mana Data Disimpan
          </h2>
          <p>
            Data kamu disimpan dengan aman di server. Sebagian data (seperti
            pengaturan dan progress) juga disimpan di browser perangkat kamu
            supaya aplikasi terasa cepat, lalu disinkronkan ke server sebagai
            cadangan.
          </p>
          <p className="mt-2">
            Untuk beberapa fitur, kami dibantu oleh layanan pihak ketiga yang
            tepercaya, misalnya untuk menjalankan AI, menyimpan gambar,
            menjalankan voice room, mengirim email, dan login lewat Google. Kami
            hanya mengirim data seperlunya untuk fitur tersebut, dan tidak menjual
            data kamu ke siapa pun.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            4. Cookie dan Penyimpanan di Browser
          </h2>
          <p>
            Kami memakai satu cookie login dan penyimpanan di browser untuk
            mengingat sesi login serta preferensi kamu (seperti tema dan
            progress). Kami tidak memakai cookie pelacak iklan dari pihak ketiga.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            5. Hak Kamu
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Meminta penghapusan akun dan data dengan menghubungi admin.
            </li>
            <li>
              Menghapus data lokal kapan saja dengan membersihkan penyimpanan
              browser kamu.
            </li>
            <li>Meminta salinan data yang tersimpan.</li>
            <li>
              Menyembunyikan status online lewat menu Pengaturan, bagian Privasi.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            6. Keamanan
          </h2>
          <p>
            Kami membatasi siapa yang bisa mengakses data, memverifikasi
            perangkat, dan mengamankan seluruh koneksi. Namun tidak ada sistem
            yang benar-benar 100% aman, jadi kami tidak bisa menjamin keamanan
            secara mutlak.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            7. Kontak
          </h2>
          <p>
            Untuk pertanyaan soal privasi, hubungi admin lewat fitur Live Chat di
            dalam platform, atau lewat{" "}
            <a
              href="https://instagram.com/haidarsfw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Instagram @haidarsfw
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
