// Auto-generated from legacy uasbmb29.xyz (B29). Best version only (*_updated).
// HTML uses custom tags <h1/h2/h3/bullet/subtitle/warning/img/b/i> parsed by
// src/lib/content-parser.tsx. Module key = display title shown in the UI.
import { marketingModule1 } from "./marketing-m1";
import { marketingModule2 } from "./marketing-m2";
import { marketingModule3 } from "./marketing-m3";
import { marketingModule4 } from "./marketing-m4";
import { marketingModule5 } from "./marketing-m5";
import { marketingModule6 } from "./marketing-m6";
import { hrModule1 } from "./hr-m1";
import { hrModule2 } from "./hr-m2";
import { hrModule3 } from "./hr-m3";
import { hrModule4 } from "./hr-m4";
import { hrModule5 } from "./hr-m5";
import { hrModule6 } from "./hr-m6";
import { misModule1 } from "./mis-m1";
import { misModule2 } from "./mis-m2";
import { misModule3 } from "./mis-m3";
import { misModule4 } from "./mis-m4";
import { misModule5 } from "./mis-m5";
import { misModule6 } from "./mis-m6";
import { introModule1 } from "./intro-m1";
import { introModule2 } from "./intro-m2";
import { introModule3 } from "./intro-m3";
import { introModule4 } from "./intro-m4";
import { introModule5 } from "./intro-m5";

export const rangkumanContent: Record<string, Record<string, string>> = {
  marketing: {
    "Modul 1: Marketing Channels & Logistics": marketingModule1,
    "Modul 2: Integrated Marketing Communication": marketingModule2,
    "Modul 3: Creating Competitive Advantage": marketingModule3,
    "Modul 4: The Global Marketplace": marketingModule4,
    "Modul 5: Sustainable Marketing": marketingModule5,
    "Addendum: Materi Pelengkap & Detail Teknis": marketingModule6,
  },
  hr: {
    "Modul 1: Manajemen Kompensasi Strategis & Sistem Insentif": hrModule1,
    "Modul 2: Manajemen Keselamatan, Kesehatan, dan Risiko Kerja": hrModule2,
    "Modul 3: Hubungan Tenaga Kerja dan Perundingan Kolektif": hrModule3,
    "Modul 4: Transformasi Infrastruktur HR (Model Ulrich & HR Analytics)": hrModule4,
    "Modul 5: Manajemen SDM Global & Bisnis Kecil (SME)": hrModule5,
    "Addendum: Detail Mikro & Teknis Pelengkap (Case Study Cheat Sheet)": hrModule6,
  },
  mis: {
    "Modul 1: Manajemen Pengetahuan & AI": misModule1,
    "Modul 2: Peningkatan Pengambilan Keputusan": misModule2,
    "Modul 3: Membangun Sistem Informasi": misModule3,
    "Modul 4: Keunggulan Operasional & Intimasi Pelanggan": misModule4,
    "Modul 5: E-Commerce & Pasar Digital": misModule5,
    "Addendum: Detail Teknis & Safety Net": misModule6,
  },
  intro: {
    "Modul 1: Kepemimpinan (Leadership)": introModule1,
    "Modul 2: Pengendalian (Controlling)": introModule2,
    "Modul 3: Kewirausahaan & Manajemen Risiko": introModule3,
    "Modul 4: Strategi & Praktik Manajemen": introModule4,
    "Addendum: Missing Links & Deep Dive": introModule5,
  },
};

export function getRangkumanBySubjectId(
  subjectId: string
): Record<string, string> | undefined {
  return rangkumanContent[subjectId];
}
