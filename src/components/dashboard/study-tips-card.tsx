"use client";

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
    <div className="surface rounded-xl bg-card p-5">
      <div>
        <h3 className="text-[13px] font-semibold text-muted-foreground mb-1">
          Tips Belajar Hari Ini
        </h3>
        <p className="text-sm text-foreground leading-relaxed">{tip}</p>
      </div>
    </div>
  );
}
