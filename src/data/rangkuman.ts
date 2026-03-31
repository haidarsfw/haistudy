/**
 * Rangkuman (summary) content per subject.
 * Uses custom HTML-like tags: <h1>, <h2>, <h3>, <bullet>, <subtitle>, <b>, <i>
 * Content will be filled in later - these are structural placeholders.
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
    "Module 1: What is AI?": `
      <h1>What is Artificial Intelligence?</h1>
      <h2>Definisi AI</h2>
      <bullet><b>Artificial Intelligence:</b> Simulasi kecerdasan manusia oleh sistem komputer.</bullet>
      <bullet><b>Turing Test:</b> Uji kemampuan mesin untuk menunjukkan perilaku cerdas setara manusia.</bullet>
      <h2>Jenis AI</h2>
      <bullet><b>Narrow AI:</b> AI yang dirancang untuk tugas spesifik (contoh: voice assistant).</bullet>
      <bullet><b>General AI:</b> AI yang memiliki kemampuan kognitif setara manusia (belum tercapai).</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
    "Module 2: Machine Learning": `
      <h1>Machine Learning Basics</h1>
      <h2>Konsep ML</h2>
      <bullet><b>Machine Learning:</b> Subset AI di mana sistem belajar dari data tanpa diprogram eksplisit.</bullet>
      <h2>Tipe Machine Learning</h2>
      <bullet><b>Supervised Learning:</b> Model dilatih dengan data berlabel (input → output yang diketahui).</bullet>
      <bullet><b>Unsupervised Learning:</b> Model menemukan pola dari data tanpa label.</bullet>
      <bullet><b>Reinforcement Learning:</b> Agen belajar melalui reward dan punishment.</bullet>
      <subtitle><b><i>Placeholder - konten lengkap akan diisi kemudian.</i></b></subtitle>
    `,
  },
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
