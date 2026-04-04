export const akuntansiModule2 = `
<h1>Modul 2: Sistem Informasi Akuntansi (Sesi 3 & 4)</h1>

<h2>Konsep Dasar dan Analisis Transaksi</h2>

Sistem informasi akuntansi berfungsi mengumpulkan, memproses, serta mengomunikasikan data keuangan entitas bisnis kepada pihak berkepentingan. Kejadian ekonomi wajib dianalisis dan dicatat ke dalam sistem hanya jika kejadian tersebut mengubah posisi keuangan entitas secara objektif.

<bullet><b>Persamaan Akuntansi Dasar:</b> $Aset = Liabilitas + Ekuitas\\ Pemegang\\ Saham$. Nilai persamaan mutlak harus selalu seimbang pascatransaksi.</bullet>
<bullet><b>Komponen Ekuitas:</b> Ekuitas pemegang saham bertambah melalui Saham Biasa dan Pendapatan, serta berkurang melalui Beban dan Dividen.</bullet>
<bullet><b>Sistem Ganda:</b> Setiap transaksi memiliki dampak minimal pada dua akun berbeda demi menjaga keseimbangan persamaan (lihat materi sesi 3, slide "Transaction Analysis").</bullet>

<b>Contoh:</b> Pembelian peralatan Rp10.000.000 secara tunai menurunkan aset Kas Rp10.000.000 dan menaikkan aset Peralatan Rp10.000.000 secara bersamaan.

<h2>Akun, Debit, dan Kredit</h2>

Akun (Account) merupakan rekaman spesifik mengenai peningkatan dan penurunan satu item spesifik aset, liabilitas, atau ekuitas. Format paling fundamental adalah <b>Akun-T</b> yang memuat sisi kiri (Debit) dan sisi kanan (Kredit).

<b>Sistem Double-Entry:</b> Total nominal debit mutlak ekuivalen dengan total nominal kredit pada setiap pencatatan.

Aturan Saldo Normal (lihat materi sesi 3, slide "Debit and Credit Rules" atau "Normal Balances"):
<bullet>Aset, Beban, dan Dividen memiliki <b>saldo normal Debit</b> (pencatatan bertambah di Debit, berkurang di Kredit).</bullet>
<bullet>Liabilitas, Saham Biasa, Saldo Laba, dan Pendapatan memiliki <b>saldo normal Kredit</b> (pencatatan bertambah di Kredit, berkurang di Debit).</bullet>

<h2>Alur Proses Pencatatan</h2>

Dokumen sumber berupa bukti struk, faktur, nota, atau kuitansi menjadi basis awal analisis bukti transaksi. Terdapat tiga tahapan utama proses akuntansi:
<bullet><b>Penjurnalan (Journalizing):</b> Transaksi dicatat secara kronologis ke dalam Jurnal Umum. Fungsi jurnal mencakup pengungkapan efek lengkap satu transaksi di satu tempat, penyediaan rekaman historis urut waktu, dan pencegahan kesalahan nominal (lihat materi sesi 3, slide "The Journal").</bullet>
<bullet><b>Buku Besar (Ledger):</b> Pusat kumpulan seluruh akun individual beserta detail perubahan saldonya yang dikelola perusahaan.</bullet>
<bullet><b>Pemindahan (Posting):</b> Proses mentransfer nominal dari kolom jurnal ke akun buku besar yang relevan untuk memperbarui saldo akhir setiap akun secara berkala (lihat materi sesi 3, slide "Posting").</bullet>

<h2>Neraca Saldo (Trial Balance)</h2>

Neraca saldo merupakan daftar keseluruhan akun beserta saldo akhirnya pada satu periode waktu tertentu, disusun urut mulai dari aset, liabilitas, ekuitas, pendapatan, hingga ditutup oleh beban.

<bullet><b>Fungsi Primer:</b> Membuktikan kesamaan matematis antara total kolom Debit dan total kolom Kredit pascaproses posting (lihat materi sesi 3, slide "The Trial Balance").</bullet>
<bullet><b>Limitasi Deteksi:</b> Neraca saldo seimbang tidak menjamin absolut kebenaran pencatatan.</bullet>
<bullet><b>Kondisi lolos deteksi:</b> Transaksi terlewat dijurnal, jurnal tidak diposting sama sekali, pencatatan jurnal diposting ganda, nominal salah saat penjurnalan awal, atau nominal diposting ke nama akun yang keliru namun posisinya tetap benar.</bullet>
`;
