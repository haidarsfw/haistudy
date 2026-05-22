import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | haistudy",
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

      <h1 className="font-heading text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Terakhir diperbarui: 7 April 2026
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 prose-headings:font-heading prose-headings:tracking-tight prose-li:my-0.5 text-sm text-foreground/80">
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
              <strong>Nama dan kelas</strong> - ditampilkan di chat, forum,
              voice rooms, dan untuk menampilkan konten sesuai jadwal ujian.
            </li>
            <li>
              <strong>Device ID</strong> - fingerprint browser untuk membatasi
              jumlah perangkat (maks. 2 per license key).
            </li>
            <li>
              <strong>Kontak (opsional)</strong> - nomor HP atau email yang kamu
              berikan secara sukarela saat onboarding.
            </li>
            <li>
              <strong>Pengaturan</strong> - preferensi tema, font, bahasa, dark
              mode, jadwal dark mode, pengingat belajar, dan status visibility.
            </li>
            <li>
              <strong>Progress belajar</strong> - materi yang sudah dibaca,
              flashcard selesai, skor quiz, dan streak belajar.
            </li>
            <li>
              <strong>Pesan chat dan forum</strong> - konten yang kamu kirim di
              global chat dan forum diskusi, termasuk gambar dan polling.
            </li>
            <li>
              <strong>Pesan support</strong> - percakapan dengan admin
              melalui fitur live chat support.
            </li>
            <li>
              <strong>Percakapan AI</strong> - riwayat percakapan dengan AI
              Study Assistant, termasuk gambar yang di-upload.
            </li>
            <li>
              <strong>Notifikasi</strong> - data notifikasi (mention, reply,
              pengumuman, polling) untuk pengiriman notifikasi yang relevan.
            </li>
            <li>
              <strong>Catatan pribadi</strong> - catatan yang kamu tulis per
              mata kuliah dan catatan umum.
            </li>
            <li>
              <strong>Bookmark</strong> - materi, flashcard, dan kisi-kisi
              yang kamu simpan.
            </li>
            <li>
              <strong>Data presence</strong> - status online dan waktu terakhir
              aktif untuk fitur &ldquo;siapa yang online&rdquo;.
            </li>
            <li>
              <strong>Activity logs</strong> - log aktivitas login dan
              penggunaan untuk keamanan.
            </li>
            <li>
              <strong>Error logs</strong> - log error teknis untuk perbaikan
              bug.
            </li>
            <li>
              <strong>Kode referral</strong> - data referral untuk tracking
              program referral.
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
            <li>Menampilkan progress belajar, analytics, dan streak.</li>
            <li>Menyediakan fitur chat, forum, dan voice rooms.</li>
            <li>Menampilkan status online (presence) kepada pengguna lain.</li>
            <li>Menyediakan layanan AI Study Assistant.</li>
            <li>Mengirim notifikasi yang relevan (mention, reply, pengumuman).</li>
            <li>Sinkronisasi pengaturan dan data antar perangkat.</li>
            <li>Menyelesaikan masalah melalui layanan pelanggan.</li>
            <li>Meningkatkan kualitas platform dan memperbaiki bug.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            3. Penyimpanan Data
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Data server disimpan di <strong>Supabase</strong> (PostgreSQL
              cloud database) dengan Row Level Security (RLS).
            </li>
            <li>
              Data lokal (pengaturan, progress, bookmark, catatan, riwayat AI)
              disimpan di <strong>localStorage</strong> browser dan disinkronkan
              ke server untuk backup antar perangkat.
            </li>
            <li>
              Media (gambar di chat dan feedback) disimpan di{" "}
              <strong>Cloudinary CDN</strong>.
            </li>
            <li>
              Gambar yang di-upload ke AI dikompresi secara lokal dan dikirim
              langsung ke provider AI (Google Gemini) tanpa disimpan di server
              kami.
            </li>
            <li>
              Platform di-host di <strong>Vercel</strong> dengan analytics
              bawaan yang bersifat anonim.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            4. Cookies & localStorage
          </h2>
          <p>
            haistudy menggunakan localStorage untuk menyimpan sesi login,
            preferensi tampilan, progress belajar, bookmark, catatan, dan
            riwayat percakapan AI. Cookie minimal digunakan hanya untuk
            session tracking. Kami tidak menggunakan tracking cookies pihak
            ketiga.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            5. Pihak Ketiga
          </h2>
          <p>
            haistudy menggunakan layanan pihak ketiga berikut:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>
              <strong>Supabase</strong> - database, autentikasi, dan real-time
              sync.
            </li>
            <li>
              <strong>Vercel</strong> - hosting dan analytics anonim.
            </li>
            <li>
              <strong>Google Gemini</strong> - AI Study Assistant untuk user
              biasa.
            </li>
            <li>
              <strong>DeepSeek</strong> - AI Study Assistant untuk user VIP.
            </li>
            <li>
              <strong>Cloudinary</strong> - penyimpanan media (gambar).
            </li>
            <li>
              <strong>LiveKit</strong> - voice rooms.
            </li>
          </ul>
          <p className="mt-2">
            Data yang dikirim ke pihak ketiga terbatas pada apa yang diperlukan
            untuk menjalankan fitur terkait.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            6. Hak Pengguna
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
            <li>
              Kamu bisa menyembunyikan status online melalui Settings &gt;
              Privasi.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            7. Keamanan
          </h2>
          <p>
            Kami menggunakan Supabase Row Level Security (RLS) untuk membatasi
            akses data. License key divalidasi di sisi server dan perangkat
            diverifikasi melalui fingerprinting. Koneksi real-time diamankan
            melalui WebSocket terenkripsi. Seluruh komunikasi menggunakan HTTPS.
          </p>
          <p className="mt-2">
            Namun, tidak ada sistem yang 100% aman - kami tidak bertanggung
            jawab atas kebocoran data akibat faktor di luar kendali kami.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            8. Kontak
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
