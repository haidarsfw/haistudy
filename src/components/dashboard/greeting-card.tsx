"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles, Shield, FlaskConical, Crown, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { subjects } from "@/data/subjects";
import { content } from "@/data/content";
import { fadeInUp } from "@/lib/motion";
import { getAllProgress, calcOverallProgress as calcOverall } from "@/lib/progress";

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
  "Gunakan metode Cornell Notes: bagi kertas jadi 3 bagian (catatan, kata kunci, ringkasan).",
  "Belajar paling efektif di pagi hari antara jam 8-11 saat otak paling segar.",
  "Coba teknik Feynman: jelaskan konsep seolah ke anak kecil, temukan gap pemahamanmu.",
  "Minum air putih cukup - dehidrasi ringan saja bisa menurunkan konsentrasi hingga 25%.",
  "Buat mind map untuk menghubungkan konsep-konsep yang saling berkaitan.",
  "Latihan soal jauh lebih efektif daripada membaca ulang catatan berkali-kali.",
  "Gunakan warna berbeda untuk highlight - tapi jangan berlebihan, max 3 warna.",
  "Sebelum tidur, review materi yang baru dipelajari selama 10 menit saja.",
  "Olahraga ringan 20 menit sebelum belajar meningkatkan fokus dan daya ingat.",
  "Buat jadwal belajar realistis - jangan terlalu padat, sisakan waktu istirahat.",
  "Coba belajar di tempat baru sesekali - perubahan lingkungan bisa meningkatkan retensi.",
  "Gunakan mnemonic (singkatan/akronim) untuk mengingat daftar atau rumus.",
  "Setiap selesai satu bab, tutup buku dan coba tulis poin-poin utamanya.",
  "Dengarkan musik instrumental (tanpa lirik) untuk meningkatkan fokus belajar.",
  "Bagi materi besar jadi bagian kecil - lebih mudah dipelajari bertahap.",
  "Coba metode SQ3R: Survey, Question, Read, Recite, Review untuk membaca akademik.",
  "Diskusi dengan teman satu kelompok bisa membuka perspektif baru tentang materi.",
  "Hindari cramming (belajar SKS) - hasilnya jauh lebih buruk dari belajar teratur.",
  "Tulis pertanyaan saat belajar, lalu coba jawab sendiri tanpa membuka catatan.",
  "Istirahatkan mata setiap 20 menit - lihat objek jauh selama 20 detik (aturan 20-20-20).",
  "Buat to-do list harian untuk belajar - centang setiap selesai, ini memotivasi!",
  "Coba belajar dengan metode interleaving: campur topik dalam satu sesi.",
  "Gunakan timer saat latihan soal untuk simulasi tekanan waktu ujian nyata.",
  "Catat hal-hal yang tidak kamu pahami - tanyakan ke dosen atau teman.",
  "Reward diri sendiri setelah menyelesaikan target belajar - ini membangun kebiasaan positif.",
];

const FUN_FACTS = [
  "Otak manusia bisa menyimpan sekitar 2.5 petabyte data - setara 3 juta jam video!",
  "Belajar sebelum tidur meningkatkan retensi memori hingga 20-40%.",
  "Menulis tangan lebih efektif untuk mengingat dibanding mengetik.",
  "Otak menggunakan 20% energi tubuh meskipun hanya 2% berat badan.",
  "Mengunyah permen karet saat belajar bisa meningkatkan konsentrasi.",
  "Otak bisa memproses gambar 60.000x lebih cepat dibanding teks.",
  "Rata-rata manusia punya 6.200 pikiran per hari menurut penelitian Queen's University.",
  "Efek Zeigarnik: otak lebih mudah mengingat tugas yang belum selesai dibanding yang sudah.",
  "Hippocampus (bagian otak untuk memori) bisa menghasilkan neuron baru sepanjang hidup.",
  "Belajar bahasa baru bisa meningkatkan ukuran hippocampus secara terukur.",
  "Dopamine dirilis saat kita belajar sesuatu yang baru - ini yang membuat belajar bisa adiktif!",
  "Rata-rata mahasiswa kehilangan 40% informasi dalam 24 jam tanpa review.",
  "Tidur REM sangat penting untuk konsolidasi memori - jangan kurangi jam tidurmu.",
  "Testing effect: mengerjakan quiz meningkatkan retensi 50% lebih baik dibanding membaca ulang.",
  "Otak manusia memiliki sekitar 86 miliar neuron - lebih banyak dari bintang di Bima Sakti.",
  "Stres moderat sebenarnya bisa meningkatkan performa kognitif - tapi berlebihan merugikan.",
  "Multitasking menurunkan produktivitas hingga 40% menurut penelitian Stanford University.",
  "Otak membutuhkan rata-rata 23 menit untuk kembali fokus setelah distraksi.",
  "Berjalan kaki 20 menit meningkatkan kreativitas hingga 60% menurut studi Stanford.",
  "Warna biru dan hijau terbukti meningkatkan kreativitas, merah meningkatkan ketelitian.",
  "Flashcards pertama kali digunakan oleh Leitner pada tahun 1972 di Austria.",
  "Rata-rata attention span manusia modern adalah 8.25 detik menurut National Center for Biotech.",
  "Otak mengkonsumsi sekitar 0.2 kalori per detik saat berpikir intensif.",
  "Cortisol (hormon stres) mengganggu retrieval memori - makanya blank saat ujian!",
  "Penelitian Oxford menunjukkan kelas pagi kurang efektif untuk remaja dari segi biologi jam internal.",
  "Otak manusia mencapai perkembangan penuh pada usia sekitar 25 tahun.",
  "Memory palace (Metode Loci) telah digunakan sejak zaman Yunani kuno untuk menghafal.",
  "Cahaya alami meningkatkan performa kognitif 15% dibanding pencahayaan buatan.",
  "Tertawa melepaskan endorfin yang membantu mengurangi stres dan meningkatkan daya ingat.",
  "Spacing effect: belajar 1 jam per hari selama 7 hari > belajar 7 jam sekaligus.",
  "Otak memproses informasi dari flashcard gambar 65% lebih baik daripada teks saja.",
  "Kafein meningkatkan kewaspadaan tapi butuh 20-45 menit untuk efeknya terasa.",
  "Penelitian menunjukkan menggambar konsep meningkatkan retensi 2x dibanding menulis.",
  "Setiap neuron bisa terhubung ke 10.000 neuron lain, membentuk triliunan koneksi.",
  "Aroma tertentu (rosemary, peppermint) terbukti bisa meningkatkan konsentrasi dan memori.",
];

function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "greeting.morning";
  if (hour < 15) return "greeting.afternoon";
  if (hour < 18) return "greeting.evening";
  return "greeting.night";
}

function getMotivation(progress: number): string {
  const day = new Date().getDay();
  if (day === 0 || day === 6) {
    if (progress < 50) return "Weekend ini waktu yang tepat untuk mengejar ketinggalan!";
    return "Weekend? Waktunya review flashcards!";
  }
  if (progress === 0) return "Yuk mulai belajar hari ini!";
  if (progress < 25) return "Langkah pertama sudah dimulai, teruskan!";
  if (progress < 50) return "Sudah ada progress - terus semangat!";
  if (progress < 75) return "Lebih dari setengah jalan, keren!";
  if (progress < 100) return "Sedikit lagi menuju 100%!";
  return "Semua materi sudah selesai - kamu luar biasa!";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function calcOverallProgress(): number {
  return calcOverall(getAllProgress(), subjects, content);
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 36;
  const stroke = 5;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  const size = (r + stroke) * 2;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-border"
        />
        <circle
          cx={r + stroke}
          cy={r + stroke}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums">{percent}%</span>
    </div>
  );
}

export function GreetingCard() {
  const { session } = useSession();
  const { t } = useTranslation();
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    setOverallProgress(calcOverallProgress());

    const handleSync = () => setOverallProgress(calcOverallProgress());
    window.addEventListener("hs-progress-synced", handleSync);
    window.addEventListener("hs-progress-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hs-progress-synced", handleSync);
      window.removeEventListener("hs-progress-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const greetingKey = useMemo(() => getGreetingKey(), []);
  const motivation = useMemo(
    () => getMotivation(overallProgress),
    [overallProgress]
  );
  const dateStr = useMemo(() => getFormattedDate(), []);

  // 6-hour rotation for tips & fun facts
  const rotationIndex = Math.floor(Date.now() / (6 * 3600 * 1000));
  const tip = TIPS[rotationIndex % TIPS.length];
  const funFact = FUN_FACTS[rotationIndex % FUN_FACTS.length];

  return (
    <motion.div
      data-onboarding="dashboard"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8 light-card-shadow"
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center gap-6">
        {/* Left: text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">{dateStr}</p>
            {session?.isAdmin && (
              <Badge variant="admin-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Shield className="h-2.5 w-2.5" />
                {t("badge.admin")}
              </Badge>
            )}
            {(session?.packageTier === "diamond") && (
              <Badge variant="diamond-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Gem className="h-2.5 w-2.5" />
                Diamond
              </Badge>
            )}
            {(session?.packageTier === "vip" || session?.packageTier === "diamond") && (
              <Badge variant="vip-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <Crown className="h-2.5 w-2.5" />
                {t("badge.vip")}
              </Badge>
            )}
            {session?.isTester && (
              <Badge variant="tester-outline" className="gap-0.5 text-[10px] h-4 px-1.5">
                <FlaskConical className="h-2.5 w-2.5" />
                {t("badge.tester")}
              </Badge>
            )}
          </div>
          <h2 className="font-heading text-xl sm:text-2xl font-extrabold mt-1 break-words">
            {t(greetingKey)}, {session?.name || "Student"}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground break-words">{motivation}</p>

        </div>

        {/* Right: progress ring */}
        <div className="shrink-0 hidden sm:block">
          <ProgressRing percent={overallProgress} />
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-border" />

      {/* Study tip + fun fact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("dashboard.study_tip")}
            </h3>
            <p className="text-sm text-foreground leading-relaxed break-words">{tip}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("dashboard.fun_fact")}
            </h3>
            <p className="text-sm text-foreground leading-relaxed break-words">{funFact}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
