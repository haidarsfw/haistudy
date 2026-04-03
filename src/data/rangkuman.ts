import { foundaiModule1 } from './foundai-m1';
import { foundaiModule2 } from './foundai-m2';
import { foundaiModule3 } from './foundai-m3';
import { foundaiModule4 } from './foundai-m4';

/**
 * Rangkuman (summary) content per subject.
 * Uses custom HTML-like tags: <h1>, <h2>, <h3>, <bullet>, <subtitle>, <b>, <i>
 */

export const rangkumanContent: Record<string, Record<string, string>> = {
  statistik: {
    "Module 1: Introduction to Statistics": `
      <h1>Introduction to Statistics</h1>
      <h2>Definisi Statistik</h2>
      <bullet><b>Statistik:</b> Ilmu yang mempelajari pengumpulan, pengolahan, analisis, dan penyajian data.</bullet>
      <bullet><b>Populasi:</b> Seluruh objek yang menjadi target penelitian.</bullet>
      <bullet><b>Sampel:</b> Bagian dari populasi yang dipilih untuk diteliti.</bullet>
      <h2>Jenis Data</h2>
      <bullet><b>Data Kualitatif:</b> Data non-numerik (kategori, label).</bullet>
      <bullet><b>Data Kuantitatif:</b> Data numerik (diskrit atau kontinu).</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
    "Module 2: Data Collection": `
      <h1>Data Collection & Presentation</h1>
      <h2>Metode Pengumpulan Data</h2>
      <bullet><b>Survei:</b> Pengumpulan data melalui kuesioner atau wawancara.</bullet>
      <bullet><b>Observasi:</b> Pengamatan langsung terhadap objek penelitian.</bullet>
      <h2>Penyajian Data</h2>
      <bullet><b>Tabel Frekuensi:</b> Mengelompokkan data ke dalam kelas-kelas interval.</bullet>
      <bullet><b>Histogram:</b> Grafik batang untuk distribusi frekuensi.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
  },

  biseko: {
    "Module 1: Introduction to Business Economics": `
      <h1>Introduction to Business Economics</h1>
      <h2>Definisi Ekonomi Bisnis</h2>
      <bullet><b>Ekonomi Bisnis:</b> Penerapan teori ekonomi dalam pengambilan keputusan bisnis.</bullet>
      <bullet><b>Mikroekonomi:</b> Studi perilaku individu dan perusahaan dalam membuat keputusan.</bullet>
      <h2>Konsep Dasar</h2>
      <bullet><b>Scarcity:</b> Keterbatasan sumber daya relatif terhadap kebutuhan manusia.</bullet>
      <bullet><b>Opportunity Cost:</b> Biaya peluang dari pilihan yang diambil.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
    "Module 2: Supply and Demand": `
      <h1>Supply and Demand</h1>
      <h2>Hukum Permintaan</h2>
      <bullet><b>Law of Demand:</b> Semakin tinggi harga, semakin rendah kuantitas yang diminta (ceteris paribus).</bullet>
      <h2>Hukum Penawaran</h2>
      <bullet><b>Law of Supply:</b> Semakin tinggi harga, semakin tinggi kuantitas yang ditawarkan (ceteris paribus).</bullet>
      <bullet><b>Equilibrium:</b> Titik di mana kurva supply dan demand bertemu.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
  },

  cbkwn: {
    "Module 1: Konsep Kewarganegaraan": `
      <h1>Konsep Kewarganegaraan</h1>
      <h2>Definisi</h2>
      <bullet><b>Warga Negara:</b> Individu yang memiliki ikatan hukum dengan suatu negara.</bullet>
      <bullet><b>Kewarganegaraan:</b> Status hukum seseorang sebagai anggota suatu negara.</bullet>
      <h2>Dasar Hukum</h2>
      <bullet><b>UUD 1945:</b> Undang-Undang Dasar sebagai hukum tertinggi di Indonesia.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
    "Module 2: Pancasila": `
      <h1>Pancasila sebagai Ideologi</h1>
      <h2>Lima Sila</h2>
      <bullet><b>Sila 1:</b> Ketuhanan Yang Maha Esa</bullet>
      <bullet><b>Sila 2:</b> Kemanusiaan yang Adil dan Beradab</bullet>
      <bullet><b>Sila 3:</b> Persatuan Indonesia</bullet>
      <bullet><b>Sila 4:</b> Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan</bullet>
      <bullet><b>Sila 5:</b> Keadilan Sosial bagi Seluruh Rakyat Indonesia</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
  },

  akuntansi: {
    "Module 1: Introduction to Accounting": `
      <h1>Introduction to Accounting</h1>
      <h2>Definisi Akuntansi</h2>
      <bullet><b>Akuntansi:</b> Proses mengidentifikasi, mengukur, dan mengkomunikasikan informasi keuangan.</bullet>
      <bullet><b>Tujuan:</b> Menyediakan informasi yang berguna untuk pengambilan keputusan ekonomi.</bullet>
      <h2>Prinsip Dasar</h2>
      <bullet><b>Going Concern:</b> Asumsi bahwa perusahaan akan terus beroperasi.</bullet>
      <bullet><b>Historical Cost:</b> Aset dicatat berdasarkan harga perolehan.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
    "Module 2: Accounting Equation": `
      <h1>Accounting Equation</h1>
      <h2>Persamaan Dasar</h2>
      <bullet><b>Assets = Liabilities + Equity</b></bullet>
      <bullet><b>Double-Entry System:</b> Setiap transaksi mempengaruhi minimal dua akun.</bullet>
      <h2>Debit dan Kredit</h2>
      <bullet><b>Debit:</b> Sisi kiri akun - menambah aset/beban, mengurangi liabilitas/ekuitas/pendapatan.</bullet>
      <bullet><b>Kredit:</b> Sisi kanan akun - mengurangi aset/beban, menambah liabilitas/ekuitas/pendapatan.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
  },

  foundai: {
    "Modul 1: Pengantar AI & Machine Learning": foundaiModule1,
    "Modul 2: AI & Data dan NLP": foundaiModule2,
    "Modul 3: Speech Recognition, CV, & Video": foundaiModule3,
    "Modul 4: Materi Tambahan & Studi Kasus": foundaiModule4,
  },
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
