import { foundaiModule1 } from './foundai-m1';
import { foundaiModule2 } from './foundai-m2';
import { foundaiModule3 } from './foundai-m3';
import { foundaiModule4 } from './foundai-m4';
import { cbkwnModule1 } from './cbkwn-m1';
import { cbkwnModule2 } from './cbkwn-m2';
import { cbkwnModule3 } from './cbkwn-m3';
import { cbkwnModule4 } from './cbkwn-m4';
import { statistikModule1 } from './statistik-m1';
import { statistikModule2 } from './statistik-m2';
import { statistikModule3 } from './statistik-m3';
import { statistikModule4 } from './statistik-m4';

/**
 * Rangkuman (summary) content per subject.
 * Uses custom HTML-like tags: <h1>, <h2>, <h3>, <bullet>, <subtitle>, <b>, <i>
 */

export const rangkumanContent: Record<string, Record<string, string>> = {
  statistik: {
    "Modul 1: Pengantar Statistika & Deskripsi Data": statistikModule1,
    "Modul 2: Ukuran Numerik & Probabilitas": statistikModule2,
    "Modul 3: Distribusi Probabilitas": statistikModule3,
    "Modul 4: Pendalaman Materi": statistikModule4,
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
    "Modul 1: Pengantar Kewarganegaraan & Nilai Norma": cbkwnModule1,
    "Modul 2: Negara, Konstitusi, Hak & Kewajiban": cbkwnModule2,
    "Modul 3: Penegakan Hukum, Demokrasi, & Wawasan Nusantara": cbkwnModule3,
    "Modul 4: Suplemen Penyempurna": cbkwnModule4,
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
