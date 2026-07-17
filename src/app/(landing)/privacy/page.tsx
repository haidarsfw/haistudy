import {
  LegalContact,
  LegalFooterNav,
  LegalList,
  LegalPage,
  LegalSection,
} from "@/components/landing/legal";

export const metadata = {
  title: "Kebijakan Privasi",
  description: "Kebijakan privasi haistudy: bagaimana data kamu dikelola.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Kebijakan Privasi"
      updated="17 Juli 2026"
      intro="Ini penjelasan soal data apa yang kami simpan, dipakai buat apa, dan apa aja yang bisa kamu minta. Ditulis apa adanya, tanpa bahasa hukum yang muter-muter."
      footer={
        <LegalFooterNav
          links={[
            { href: "/terms", label: "Ketentuan Layanan" },
            { href: "/refund", label: "Pengembalian Dana" },
          ]}
        />
      }
    >
      <LegalSection n={1} title="Data yang Kami Simpan">
        <p>Saat kamu memakai haistudy, kami menyimpan:</p>
        <LegalList>
          <li>
            Nama dan kelas kamu (ditampilkan di chat, forum, dan voice room).
          </li>
          <li>
            Kalau kamu masuk dengan Google: email dan foto profil Google kamu.
          </li>
          <li>
            Kalau kamu daftar dengan email: alamat email dan password kamu.
            Password disimpan dalam bentuk teracak (hash), jadi kami sendiri
            tidak bisa membacanya.
          </li>
          <li>
            Perangkat yang kamu pakai untuk masuk, supaya jumlah perangkat bisa
            dibatasi sesuai paket kamu.
          </li>
          <li>
            Nomor WhatsApp kamu, dari proses pembelian atau kalau kamu
            memberikannya sendiri.
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
            Riwayat percakapan kamu dengan asisten AI, termasuk gambar yang kamu
            unggah.
          </li>
          <li>Jawaban, skor, dan riwayat Latihan Soal kamu.</li>
          <li>Catatan pribadi dan bookmark kamu.</li>
          <li>
            Data pembelian: nama, nomor WhatsApp, email, kampus, kelas, jumlah
            perangkat, dari mana kamu tahu haistudy, dan bukti transfer yang
            kamu unggah.
          </li>
          <li>
            Notifikasi dan sedikit catatan aktivitas masuk, untuk keamanan dan
            perbaikan bug.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection n={2} title="Untuk Apa Data Dipakai">
        <LegalList>
          <li>Memastikan akun dan perangkat kamu.</li>
          <li>Memverifikasi pembayaran dan mengaktifkan akses kamu.</li>
          <li>Menampilkan progress, statistik, dan streak belajar.</li>
          <li>Menjalankan fitur chat, forum, pesan pribadi, dan voice room.</li>
          <li>Menampilkan status online kamu ke pengguna lain.</li>
          <li>Menjalankan asisten belajar AI dan penilaian Latihan Soal.</li>
          <li>
            Mengirim notifikasi yang relevan (mention, balasan, pengumuman) dan
            email seperti invoice pesanan.
          </li>
          <li>Menyinkronkan pengaturan dan data antar perangkat kamu.</li>
          <li>Menyelesaikan masalah lewat layanan bantuan.</li>
          <li>Memperbaiki bug dan meningkatkan kualitas platform.</li>
        </LegalList>
        <p>
          Kami tidak menjual data kamu ke siapa pun, dan tidak memakainya untuk
          iklan.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Di Mana Data Disimpan">
        <p>
          Data kamu disimpan dengan aman di server. Sebagian data (seperti
          pengaturan dan progress) juga disimpan di browser perangkat kamu
          supaya aplikasi terasa cepat, lalu disinkronkan ke server sebagai
          cadangan.
        </p>
        <p>
          Untuk beberapa fitur, kami dibantu oleh layanan pihak ketiga yang
          tepercaya, misalnya untuk menjalankan server dan database, menjalankan
          AI, menyimpan gambar, menjalankan voice room, mengirim email, dan
          masuk lewat Google. Sebagian layanan itu servernya berada di luar
          Indonesia. Kami hanya mengirim data seperlunya untuk fitur tersebut.
        </p>
        <p>
          Khusus asisten AI: pertanyaan dan gambar yang kamu kirim diteruskan ke
          penyedia AI pihak ketiga supaya bisa dijawab. Jadi sebaiknya jangan
          kirim data pribadi yang sensitif ke AI.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Cookie dan Penyimpanan di Browser">
        <p>
          Kami memakai satu cookie login dan penyimpanan di browser untuk
          mengingat sesi masuk serta preferensi kamu (seperti tema dan
          progress).
        </p>
        <p>
          Kami juga memakai layanan pengukuran yang menghitung kunjungan dan
          kecepatan halaman secara anonim, supaya kami tahu bagian mana yang
          perlu diperbaiki. Layanan itu tidak memakai cookie pelacak dan tidak
          membangun profil pribadi tentang kamu.
        </p>
        <p>Kami tidak memakai cookie pelacak iklan dari pihak ketiga.</p>
      </LegalSection>

      <LegalSection n={5} title="Berapa Lama Data Disimpan">
        <p>
          Data kamu tetap kami simpan meski masa akses kamu sudah habis, supaya
          kalau suatu saat kamu beli akses lagi, progress, catatan, dan riwayat
          belajar kamu masih utuh. Tidak ada penghapusan otomatis.
        </p>
        <p>
          Kalau kamu tidak mau begitu, kamu bisa minta data kamu dihapus kapan
          saja lewat kontak di bawah.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Hak Kamu">
        <LegalList>
          <li>Meminta penghapusan akun dan data dengan menghubungi admin.</li>
          <li>Meminta salinan data kamu yang tersimpan.</li>
          <li>Meminta perbaikan data kamu yang keliru.</li>
          <li>
            Menghapus data lokal kapan saja dengan membersihkan penyimpanan
            browser kamu.
          </li>
          <li>
            Menyembunyikan status online lewat menu Pengaturan, bagian Privasi.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection n={7} title="Keamanan">
        <p>
          Kami membatasi siapa yang bisa mengakses data, memverifikasi
          perangkat, menyimpan password dalam bentuk teracak, dan mengamankan
          seluruh koneksi. Namun tidak ada sistem yang benar-benar 100% aman,
          jadi kami tidak bisa menjamin keamanan secara mutlak.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Perubahan Kebijakan">
        <p>
          Kami bisa mengubah kebijakan ini sewaktu-waktu. Perubahan akan
          diumumkan lewat platform.
        </p>
      </LegalSection>

      <LegalContact
        n={9}
        waText="Halo min, saya mau tanya soal kebijakan privasi"
      />
    </LegalPage>
  );
}
