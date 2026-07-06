import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service",
  description: "Syarat dan ketentuan penggunaan platform haistudy.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:py-16 lg:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:rounded"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-6">
        Ketentuan Layanan
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Terakhir diperbarui: 6 Juli 2026
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 prose-headings:font-heading prose-headings:tracking-tight prose-li:my-0.5 text-sm text-foreground/80">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            1. Persetujuan
          </h2>
          <p>
            Dengan memakai haistudy, kamu setuju dengan ketentuan ini. Kalau
            kamu tidak setuju, mohon berhenti memakai platform.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            2. Aturan License Key
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              License key kamu bersifat <strong>pribadi</strong>. Jangan
              dibagikan ke siapa pun, dengan alasan apa pun.
            </li>
            <li>
              Satu license key bisa dipakai maksimal di 2 perangkat (1 utama dan
              1 cadangan).
            </li>
            <li>
              Kalau license key dibagikan, dijual, atau dipinjamkan, akses kamu
              akan <strong>diblokir permanen tanpa pengembalian dana</strong>.
            </li>
            <li>License key berlaku 30 hari sejak diaktifkan.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            3. Paket dan Pembelian
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Share</strong>: akses penuh dengan syarat membagikan link
              referral ke teman sesuai ketentuan yang berlaku.
            </li>
            <li>
              <strong>Normal</strong>: akses penuh tanpa syarat tambahan.
            </li>
            <li>
              <strong>VIP</strong>: semua fitur Normal, ditambah AI yang lebih
              pintar, badge VIP, fitur pesan pribadi, dan bantuan yang lebih
              cepat.
            </li>
          </ul>
          <p className="mt-2">
            Pembelian dicek manual (maksimal 1x24 jam) dan bersifat{" "}
            <strong>final tanpa pengembalian dana</strong>. Saat membeli, kamu
            mengisi nama, nomor WhatsApp, dan email untuk proses aktivasi akses.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            4. Yang Tidak Boleh Dilakukan
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Membagikan license key ke orang lain.</li>
            <li>Memakai platform untuk mencontek saat ujian yang sebenarnya.</li>
            <li>
              Mengirim konten yang melanggar hukum, spam, atau menyinggung SARA
              di chat, forum, maupun layanan bantuan.
            </li>
            <li>Menyalahgunakan fitur mention atau @all untuk spam.</li>
            <li>Mencoba meretas atau merusak sistem platform.</li>
            <li>
              Menyalin dan menyebarkan ulang materi (rangkuman, flashcards,
              quiz, kisi-kisi) tanpa izin.
            </li>
            <li>Memakai bot atau alat otomatis untuk mengakses platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            5. Fitur Platform
          </h2>
          <p>haistudy menyediakan, antara lain:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Materi kuliah (slide, rangkuman, kisi-kisi).</li>
            <li>Flashcards, quiz, dan Belajar Kilat.</li>
            <li>Latihan Soal, yaitu ujian latihan yang dinilai otomatis.</li>
            <li>Cheat sheet ringkas untuk mata kuliah tertentu.</li>
            <li>
              Asisten belajar AI untuk menjelaskan materi dan menjawab
              pertanyaan, termasuk dari gambar.
            </li>
            <li>Forum diskusi dan polling per mata kuliah.</li>
            <li>Chat bareng seangkatan dan pesan pribadi (untuk VIP).</li>
            <li>Voice room untuk belajar bersama.</li>
            <li>Catatan pribadi, bookmark, progress, dan statistik belajar.</li>
            <li>Layanan bantuan lewat live chat, WhatsApp, dan Instagram.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            6. Tentang Materi dan Jawaban AI
          </h2>
          <p>
            Materi di haistudy bersifat edukatif dan merupakan rangkuman dari
            bahan kuliah. Platform ini <strong>bukan pengganti</strong> materi
            resmi dari dosen. Selalu cek kembali ke materi resmi dari kampus.
          </p>
          <p className="mt-2">
            Jawaban dari asisten AI belum tentu selalu benar. Selalu periksa
            ulang dengan materi dari dosen.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            7. Batasan Tanggung Jawab
          </h2>
          <p>
            haistudy disediakan apa adanya. Kami tidak bertanggung jawab atas:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Hasil ujian pengguna.</li>
            <li>Gangguan atau layanan yang sedang tidak bisa diakses.</li>
            <li>Kehilangan data akibat masalah teknis.</li>
            <li>Kerugian yang muncul dari pemakaian platform.</li>
            <li>Ketidaktepatan jawaban asisten AI.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            8. Layanan Bantuan
          </h2>
          <p>
            Kamu bisa menghubungi admin lewat fitur live chat di dalam aplikasi,
            WhatsApp, atau Instagram. Percakapan bantuan kami simpan untuk
            menyelesaikan masalah dan meningkatkan layanan.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            9. Perubahan Ketentuan
          </h2>
          <p>
            Kami bisa mengubah ketentuan ini sewaktu-waktu. Perubahan akan
            diumumkan lewat platform. Kalau kamu terus memakai haistudy setelah
            ada perubahan, berarti kamu setuju dengan ketentuan yang baru.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            10. Kontak
          </h2>
          <p>
            Untuk pertanyaan atau laporan pelanggaran, hubungi admin lewat fitur
            Live Chat di dalam platform, atau lewat{" "}
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
