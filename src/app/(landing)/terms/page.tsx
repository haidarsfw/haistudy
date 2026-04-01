import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | haistudy",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-heading text-2xl font-bold mb-6">
        Terms of Service
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Terakhir diperbarui: 2 April 2026
      </p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm text-foreground/80">
        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            1. Penerimaan Ketentuan
          </h2>
          <p>
            Dengan menggunakan haistudy, kamu menyetujui ketentuan layanan ini.
            Jika tidak setuju, harap berhenti menggunakan platform.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            2. Ketentuan License Key
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Setiap license key bersifat personal dan tidak boleh dibagikan
              (kecuali paket Share).
            </li>
            <li>
              Maksimal 2 perangkat per license key (1 primary + 1 backup).
            </li>
            <li>
              Penyalahgunaan license key (berbagi, menjual kembali) dapat
              mengakibatkan pemblokiran akses.
            </li>
            <li>
              License key berlaku sesuai durasi paket yang dibeli (30 hari sejak
              aktivasi).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            3. Penggunaan yang Dilarang
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Membagikan license key kepada orang yang tidak berhak.</li>
            <li>
              Menggunakan platform untuk kecurangan akademik (mencontek saat
              ujian).
            </li>
            <li>Mengirim konten yang melanggar hukum, spam, atau SARA di forum/chat.</li>
            <li>Menyalahgunakan fitur @mention atau @all untuk spam.</li>
            <li>
              Mencoba meretas, mendecompile, atau merusak sistem platform.
            </li>
            <li>
              Menyalin dan mendistribusikan ulang konten tanpa izin.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            4. Konten dan Disclaimer
          </h2>
          <p>
            Materi di haistudy bersifat edukatif dan merupakan rangkuman dari
            bahan kuliah. Platform ini <strong>bukan pengganti</strong> materi
            resmi dari dosen. Selalu rujuk ke materi kuliah resmi untuk
            kepastian.
          </p>
          <p className="mt-2">
            AI Study Assistant menjawab berdasarkan konten yang sudah di-input
            (flashcards, rangkuman, kisi-kisi). Jawaban AI mungkin tidak selalu
            akurat - selalu verifikasi dengan materi dosen.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            5. Batasan Tanggung Jawab
          </h2>
          <p>
            haistudy disediakan &ldquo;sebagaimana adanya&rdquo; tanpa jaminan
            apa pun. Kami tidak bertanggung jawab atas:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Hasil ujian pengguna.</li>
            <li>Downtime atau gangguan layanan.</li>
            <li>Kehilangan data akibat masalah teknis.</li>
            <li>Kerugian yang timbul dari penggunaan platform.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            6. Perubahan Ketentuan
          </h2>
          <p>
            Kami berhak mengubah ketentuan ini kapan saja. Perubahan akan
            diumumkan melalui platform. Penggunaan berkelanjutan setelah
            perubahan berarti kamu menyetujui ketentuan yang baru.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            7. Layanan Pelanggan
          </h2>
          <p>
            haistudy menyediakan fitur live chat dalam platform untuk komunikasi
            langsung dengan admin. Percakapan support disimpan sampai masalah
            dianggap selesai (resolved) oleh admin. Data chat support hanya
            digunakan untuk membantu menyelesaikan masalah pengguna.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-2">
            8. Kontak
          </h2>
          <p>
            Untuk pertanyaan atau laporan pelanggaran, hubungi admin melalui
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
