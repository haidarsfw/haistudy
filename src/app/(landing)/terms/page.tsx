import Link from "next/link";
import {
  LegalContact,
  LegalFooterNav,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/landing/legal";

export const metadata = {
  title: "Ketentuan Layanan",
  description: "Syarat dan ketentuan penggunaan platform haistudy.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Ketentuan Layanan"
      updated="17 Juli 2026"
      intro="Ini aturan main haistudy, ditulis sejelas mungkin biar kamu gak perlu nebak-nebak. Kalau ada bagian yang masih bikin bingung, chat admin aja langsung."
      footer={
        <LegalFooterNav
          links={[
            { href: "/privacy", label: "Kebijakan Privasi" },
            { href: "/refund", label: "Pengembalian Dana" },
          ]}
        />
      }
    >
      <LegalSection n={1} title="Persetujuan">
        <p>
          Dengan memakai haistudy, kamu setuju dengan ketentuan ini. Kalau kamu
          tidak setuju, mohon berhenti memakai platform.
        </p>
        <p>haistudy ditujukan untuk mahasiswa, bukan untuk anak-anak.</p>
      </LegalSection>

      <LegalSection n={2} title="Akun Kamu">
        <LegalList>
          <li>
            Kamu masuk ke haistudy pakai akun Google, atau pakai email dan
            password yang kamu daftarkan sendiri.
          </li>
          <li>
            Akun kamu bersifat <strong>pribadi</strong>. Jangan dibagikan ke
            siapa pun, dengan alasan apa pun.
          </li>
          <li>
            Jumlah perangkat tergantung paket: <strong>Share</strong> dan{" "}
            <strong>Normal</strong> maksimal 2 perangkat, <strong>VIP</strong>{" "}
            dan <strong>Diamond</strong> maksimal 3 perangkat.
          </li>
          <li>
            Kalau akun kamu dibagikan, dijual, atau dipinjamkan, aksesnya akan{" "}
            <strong>diblokir permanen tanpa pengembalian dana</strong>.
          </li>
          <li>
            Jaga kerahasiaan password kamu. Semua aktivitas yang berjalan dari
            akun kamu jadi tanggung jawab kamu.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection n={3} title="Paket dan Pembelian">
        <LegalList>
          <li>
            <strong>Share</strong>: akses penuh, dengan syarat kamu membagikan
            haistudy ke teman dan mengirim bukti share-nya.
          </li>
          <li>
            <strong>Normal</strong>: akses penuh tanpa syarat tambahan.
          </li>
          <li>
            <strong>VIP</strong>: semua yang ada di Normal, ditambah AI yang
            lebih pintar dan diprioritaskan, pesan pribadi, kustomisasi
            tampilan, badge VIP, dan bantuan yang lebih cepat.
          </li>
          <li>
            <strong>Diamond</strong>: semua yang ada di VIP, ditambah badge dan
            efek nama eksklusif, sebagai bentuk dukungan ke pengembangan
            haistudy.
          </li>
        </LegalList>
        <p>
          Harga tiap paket ada di{" "}
          <Link
            href="/#harga"
            className="text-primary underline-offset-4 hover:underline"
          >
            halaman utama
          </Link>
          . Pembelian dicek manual oleh admin, maksimal 1x24 jam sejak bukti
          bayar kamu masuk.
        </p>
        <p>
          Akses berlaku <strong>30 hari sejak diaktifkan</strong>. Durasi itu
          disiapkan untuk menutup satu periode ujian yang kamu beli, misalnya
          UAS Semester 2.
        </p>
        <p>
          Saat membeli, kamu mengisi nama, nomor WhatsApp, email, kampus, kelas,
          dan jumlah perangkat, lalu mengunggah bukti transfer. Data itu dipakai
          untuk memverifikasi pembayaran dan mengaktifkan akses kamu.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Pengembalian Dana">
        <p>
          Pembelian bersifat final, karena begitu aksesnya aktif semua materinya
          langsung terbuka untuk kamu. Tapi ada kondisi yang dananya tetap kami
          kembalikan: pembayaran dobel atau kelebihan nominal, pembayaran sudah
          masuk tapi akses tidak pernah aktif, dan gangguan platform yang
          membuat haistudy tidak bisa dipakai sama sekali selama periode ujian
          kamu.
        </p>
        <p>
          Naik paket bisa kapan saja dengan membayar selisihnya. Turun paket
          hanya bisa dalam <strong>1 jam pertama</strong> setelah pembelian kamu
          disetujui admin.
        </p>
        <p>
          Rincian lengkapnya, termasuk apa saja yang tidak bisa dikembalikan dan
          cara mengajukannya, ada di halaman{" "}
          <Link
            href="/refund"
            className="text-primary underline-offset-4 hover:underline"
          >
            Pengembalian Dana
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection n={5} title="Yang Tidak Boleh Dilakukan">
        <LegalList>
          <li>Membagikan akses akun kamu ke orang lain.</li>
          <li>Memakai platform untuk mencontek saat ujian yang sebenarnya.</li>
          <li>
            Mengirim konten yang melanggar hukum, spam, atau menyinggung SARA di
            chat, forum, maupun layanan bantuan.
          </li>
          <li>Menyalahgunakan fitur mention atau @all untuk spam.</li>
          <li>Mencoba meretas atau merusak sistem platform.</li>
          <li>
            Menyalin dan menyebarkan ulang materi (rangkuman, flashcard, latihan
            soal, cheat sheet, kisi-kisi) tanpa izin.
          </li>
          <li>Memakai bot atau alat otomatis untuk mengakses platform.</li>
        </LegalList>
      </LegalSection>

      <LegalSection n={6} title="Fitur Platform">
        <p>haistudy menyediakan, antara lain:</p>
        <LegalList>
          <li>Materi kuliah (slide, rangkuman, kisi-kisi).</li>
          <li>Flashcard, quiz, dan Belajar Kilat.</li>
          <li>
            Latihan Soal, yaitu ujian latihan yang jawabannya dinilai otomatis
            oleh AI.
          </li>
          <li>Cheat sheet ringkas untuk mata kuliah tertentu.</li>
          <li>
            Asisten belajar AI untuk menjelaskan materi dan menjawab pertanyaan,
            termasuk dari gambar.
          </li>
          <li>Forum diskusi dan polling per mata kuliah.</li>
          <li>Chat bareng seangkatan, dan pesan pribadi untuk VIP ke atas.</li>
          <li>Voice room untuk belajar bersama.</li>
          <li>Catatan pribadi, bookmark, progress, dan statistik belajar.</li>
          <li>Layanan bantuan lewat live chat, WhatsApp, dan Instagram.</li>
        </LegalList>
        <p>
          Fitur bisa kami tambah, ubah, atau hentikan sewaktu-waktu. Kalau ada
          perubahan besar, kami umumkan lewat platform.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Tentang Materi dan Jawaban AI">
        <p>
          Materi di haistudy bersifat edukatif dan merupakan rangkuman dari
          bahan kuliah. Platform ini <strong>bukan pengganti</strong> materi
          resmi dari dosen. Selalu cek kembali ke materi resmi dari kampus.
        </p>
        <p>
          Jawaban dan penilaian dari AI belum tentu selalu benar. Nilai Latihan
          Soal adalah perkiraan untuk latihan, bukan nilai resmi. Selalu periksa
          ulang dengan materi dari dosen.
        </p>
        <p>
          haistudy dibuat secara mandiri oleh mahasiswa. Platform ini tidak
          terafiliasi dengan, tidak didukung oleh, dan bukan bagian dari BINUS
          University maupun kampus mana pun.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Batasan Tanggung Jawab">
        <p>
          haistudy disediakan apa adanya. Kami tidak bertanggung jawab atas:
        </p>
        <LegalList>
          <li>Hasil ujian pengguna.</li>
          <li>Gangguan atau layanan yang sedang tidak bisa diakses.</li>
          <li>Kehilangan data akibat masalah teknis.</li>
          <li>Kerugian yang muncul dari pemakaian platform.</li>
          <li>Ketidaktepatan jawaban maupun penilaian AI.</li>
        </LegalList>
      </LegalSection>

      <LegalSection n={9} title="Layanan Bantuan">
        <p>
          Kamu bisa menghubungi admin lewat fitur live chat di dalam aplikasi,
          WhatsApp, email, atau Instagram. Percakapan bantuan kami simpan untuk
          menyelesaikan masalah dan meningkatkan layanan.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Perubahan Ketentuan">
        <p>
          Kami bisa mengubah ketentuan ini sewaktu-waktu. Perubahan akan
          diumumkan lewat platform. Kalau kamu terus memakai haistudy setelah
          ada perubahan, berarti kamu setuju dengan ketentuan yang baru.
        </p>
      </LegalSection>

      <LegalContact
        n={11}
        waText="Halo min, saya mau tanya soal ketentuan layanan"
      />
    </LegalPage>
  );
}
