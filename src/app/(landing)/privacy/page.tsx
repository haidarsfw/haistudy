import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | haistudy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Terakhir diperbarui: 2 April 2026
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-foreground/80">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            1. Data yang Kami Kumpulkan
          </h2>
          <p>
            haistudy mengumpulkan data berikut saat kamu menggunakan platform:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>License key</strong> - untuk autentikasi dan manajemen
              akses.
            </li>
            <li>
              <strong>Nama</strong> - ditampilkan di chat, forum, dan
              leaderboard.
            </li>
            <li>
              <strong>Kelas</strong> - untuk menampilkan konten sesuai jadwal
              ujian.
            </li>
            <li>
              <strong>Device ID</strong> - fingerprint browser untuk membatasi
              jumlah device (maks. 2).
            </li>
            <li>
              <strong>Progress belajar</strong> - materi yang sudah dibaca,
              flashcard selesai, skor quiz.
            </li>
            <li>
              <strong>Pesan chat & forum</strong> - konten yang kamu kirim di
              forum dan global chat.
            </li>
            <li>
              <strong>Pesan support chat</strong> - percakapan dengan admin
              melalui fitur live chat support.
            </li>
            <li>
              <strong>Notifikasi</strong> - data notifikasi (mention,
              pengumuman) untuk pengiriman notifikasi yang relevan.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            2. Penggunaan Data
          </h2>
          <p>Data digunakan untuk:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Autentikasi dan verifikasi perangkat.</li>
            <li>Menampilkan progress belajar dan leaderboard.</li>
            <li>Menyediakan fitur chat dan forum.</li>
            <li>Menampilkan status online (presence).</li>
            <li>Meningkatkan kualitas platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            3. Penyimpanan Data
          </h2>
          <p>
            Data disimpan di Supabase cloud database dan localStorage
            browser (lokal). Data lokal seperti progress belajar, pengaturan
            tema, dan font disimpan di browser dan tidak dikirim ke server
            kecuali untuk sinkronisasi antar perangkat. Media (gambar, audio)
            yang dikirim melalui chat disimpan di Cloudinary CDN.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            4. Cookies & localStorage
          </h2>
          <p>
            haistudy menggunakan localStorage untuk menyimpan sesi login,
            preferensi tema, progress belajar, dan pengaturan pengguna. Kami
            tidak menggunakan tracking cookies pihak ketiga.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            5. Hak Pengguna
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Kamu bisa meminta penghapusan akun dan data dengan menghubungi
              admin.
            </li>
            <li>
              Kamu bisa menghapus data lokal kapan saja dengan membersihkan
              localStorage browser.
            </li>
            <li>Kamu bisa meminta ekspor data yang tersimpan.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            6. Keamanan
          </h2>
          <p>
            Kami menggunakan Supabase Row Level Security (RLS) untuk membatasi akses data.
            License key divalidasi di sisi server dan perangkat diverifikasi
            melalui fingerprinting. Koneksi real-time diamankan melalui
            WebSocket terenkripsi. Namun, tidak ada sistem yang 100% aman - kami
            tidak bertanggung jawab atas kebocoran data akibat faktor di luar
            kendali kami.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            7. Kontak
          </h2>
          <p>
            Untuk pertanyaan terkait privasi, hubungi admin melalui
            fitur Live Chat di dalam platform, atau melalui{" "}
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
