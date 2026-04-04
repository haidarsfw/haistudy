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
import { bisekoModule1 } from './biseko-m1';
import { bisekoModule2 } from './biseko-m2';
import { bisekoModule3 } from './biseko-m3';
import { bisekoModule4 } from './biseko-m4';
import { bisekoModule5 } from './biseko-m5';
import { bisekoModule6 } from './biseko-m6';
import { bisekoModule7 } from './biseko-m7';
import { akuntansiModule1 } from './akuntansi-m1';
import { akuntansiModule2 } from './akuntansi-m2';
import { akuntansiModule3 } from './akuntansi-m3';
import { akuntansiModule4 } from './akuntansi-m4';
import { akuntansiModule5 } from './akuntansi-m5';
import { akuntansiModule6 } from './akuntansi-m6';
import { akuntansiModule7 } from './akuntansi-m7';
import { akuntansiModule8 } from './akuntansi-m8';

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
    "Modul 1: Lingkungan Bisnis dan Organisasi Bisnis": bisekoModule1,
    "Modul 2: Konsumen, Permintaan, dan Elastisitas Harga": bisekoModule2,
    "Modul 3: Biaya Produksi, Pendapatan, dan Keuntungan": bisekoModule3,
    "Modul 4: Struktur Pasar dan Maksimisasi Keuntungan": bisekoModule4,
    "Modul 5: Pemasaran Digital & Maksimalisasi Laba": bisekoModule5,
    "Modul 6: Strategi Bisnis, Globalisasi, dan MNC": bisekoModule6,
    "Modul 7: Penyempurna": bisekoModule7,
  },

  cbkwn: {
    "Modul 1: Pengantar Kewarganegaraan & Nilai Norma": cbkwnModule1,
    "Modul 2: Negara, Konstitusi, Hak & Kewajiban": cbkwnModule2,
    "Modul 3: Penegakan Hukum, Demokrasi, & Wawasan Nusantara": cbkwnModule3,
    "Modul 4: Suplemen Penyempurna": cbkwnModule4,
  },

  akuntansi: {
    "Modul 1: Pengantar Laporan Keuangan": akuntansiModule1,
    "Modul 2: Sistem Informasi Akuntansi": akuntansiModule2,
    "Modul 3: Konsep Akuntansi Akrual": akuntansiModule3,
    "Modul 4: Operasi Perdagangan dan Laporan Laba Rugi Multi-Langkah": akuntansiModule4,
    "Modul 5: Kecurangan, Pengendalian Internal, dan Kas": akuntansiModule5,
    "Modul 6: Laporan Arus Kas": akuntansiModule6,
    "Modul 7: Analisis Keuangan: Gambaran Besar": akuntansiModule7,
    "Modul 8: Suplemen Penyempurna Keseluruhan": akuntansiModule8,
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
