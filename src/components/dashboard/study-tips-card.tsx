"use client";

import { Lightbulb } from "lucide-react";

const TIPS = [
  "Gunakan teknik Pomodoro: belajar 25 menit, istirahat 5 menit. Ulangi 4x lalu istirahat panjang.",
  "Flashcards paling efektif jika diulang secara berkala (spaced repetition). Coba review setiap hari!",
  "Sebelum membaca materi baru, coba tulis apa yang kamu sudah tahu tentang topik tersebut.",
  "Ajarkan materi ke teman - ini adalah cara paling efektif untuk menguji pemahaman kamu.",
  "Jangan hanya membaca! Kerjakan quiz setelah selesai mempelajari setiap modul.",
  "Buat ringkasan dengan kata-kata sendiri setelah membaca rangkuman. Ini melatih active recall.",
  "Tidur cukup sebelum UTS - otak memproses dan menyimpan informasi selama tidur.",
  "Belajar di tempat yang konsisten membantu otak masuk ke 'study mode' lebih cepat.",
  "Jangan multitasking saat belajar. Fokus pada satu mata kuliah dalam satu sesi.",
  "Review kisi-kisi secara rutin - ini panduan utama untuk mengetahui apa yang diujikan.",
];

export function StudyTipsCard() {
  // Day-based tip rotation
  const tipIndex = Math.floor(Date.now() / 86400000) % TIPS.length;
  const tip = TIPS[tipIndex];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
          <Lightbulb className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Tips Belajar Hari Ini
          </h3>
          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
        </div>
      </div>
    </div>
  );
}
