"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Sparkles, Shield, FlaskConical, Crown, Gem } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { fadeInUp } from "@/lib/motion";
import { getAllProgress, calcOverallProgress as calcOverall } from "@/lib/progress";
import { useScopedData } from "@/components/providers/scoped-data-provider";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { scopeFullLabel } from "@/lib/scope";

const TIPS_UTS = [
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

const TIPS_UAS = [
  "Buat peta konsep antar-bab untuk melihat hubungan materi secara keseluruhan — UAS menguji pemahaman kumulatif.",
  "Prioritaskan materi yang paling sering muncul di kisi-kisi UAS dan latihan soal semester ini.",
  "Gunakan teknik elaborative interrogation: tanya 'mengapa' dan 'bagaimana' untuk setiap konsep kunci.",
  "Latih menjawab soal essay dengan timer — kemampuan menulis cepat dan terstruktur sangat penting di UAS.",
  "Buat cheat sheet satu halaman per mata kuliah — proses pembuatannya sendiri meningkatkan pemahaman.",
  "Review kesalahan UTS-mu sebagai bahan belajar — pola kesalahan cenderung berulang di UAS.",
  "Coba retrieval practice: tutup semua catatan dan tulis semua yang kamu ingat tentang satu topik.",
  "Gunakan dual coding: gabungkan teks dan diagram visual untuk setiap konsep yang kompleks.",
  "Simulasikan kondisi ujian sesungguhnya — duduk di meja, atur timer, tanpa gangguan.",
  "Fokus pada pemahaman 'big picture' sebelum mendalami detail — UAS sering menguji koneksi antar materi.",
  "Gunakan self-explanation: jelaskan setiap langkah penyelesaian soal dengan kata-katamu sendiri.",
  "Buat daftar istilah kunci beserta definisi untuk setiap mata kuliah — ini memperkuat pondasi pemahaman.",
  "Manfaatkan waktu jeda antar ujian untuk review singkat mata kuliah berikutnya.",
  "Hindari belajar materi baru di malam sebelum ujian — fokus pada review dan penguatan memori.",
  "Coba 'brain dump': di awal sesi belajar, tulis semua yang kamu ingat lalu temukan gap-nya.",
  "Gabungkan sumber belajar: rangkuman, flashcards, dan latihan soal untuk variasi yang lebih efektif.",
  "Perhatikan pola soal dari UTS dan latihan — dosen sering menggunakan format yang konsisten.",
  "Buat jadwal review bertingkat: H-7 overview, H-3 deep dive, H-1 quick recap.",
  "Istirahat aktif (stretching, jalan kaki) lebih menyegarkan otak dibanding scrolling media sosial.",
  "Kelompokkan materi berdasarkan tingkat kesulitan — selesaikan yang sulit saat energi masih tinggi.",
  "Rekam dirimu menjelaskan materi, lalu dengarkan ulang — ini variasi efektif dari teknik teach-back.",
  "Hubungkan materi kuliah dengan situasi dunia nyata — ini memperdalam pemahaman dan mempermudah recall.",
  "Siapkan alat tulis dan keperluan ujian dari malam sebelumnya untuk mengurangi stres pagi hari.",
  "Makan makanan bergizi tinggi protein dan lemak sehat sebelum ujian — hindari makanan berat yang bikin ngantuk.",
  "Identifikasi 20% materi yang mencakup 80% soal ujian (Prinsip Pareto) dan kuasai itu terlebih dahulu.",
  "Buat soal ujian prediksi sendiri berdasarkan materi — ini melatih cara berpikir seperti pembuat soal.",
  "Atur HP ke mode fokus selama sesi belajar — setiap distraksi membutuhkan waktu pemulihan konsentrasi.",
  "Tidur minimal 7 jam di malam sebelum UAS — kurang tidur secara signifikan menurunkan kemampuan berpikir.",
  "Baca seluruh soal ujian dulu sebelum mulai menjawab — ini membantu mengatur strategi dan alokasi waktu.",
  "Untuk soal hitungan, selalu cek ulang satuan dan unit di setiap langkah perhitungan.",
  "Jawab soal yang paling kamu kuasai terlebih dahulu untuk membangun momentum dan kepercayaan diri.",
  "Saat soal pilihan ganda, eliminasi opsi yang jelas salah dulu untuk meningkatkan probabilitas benar.",
  "Lakukan breathing exercise 4-7-8 sebelum ujian: hirup 4 detik, tahan 7, buang 8 — menurunkan kecemasan.",
  "Tulis ringkasan singkat di akhir setiap sesi belajar — ini menutup loop memori dengan efektif.",
  "Percaya pada persiapanmu — overthinking di menit-menit terakhir justru mengganggu kemampuan recall.",
];

const FUN_FACTS_UTS = [
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

const FUN_FACTS_UAS = [
  "Suhu ruangan sekitar 22°C menghasilkan performa kognitif optimal menurut riset Helsinki University of Technology.",
  "Otak melakukan 'synaptic pruning' saat tidur — koneksi yang jarang terpakai dipangkas untuk efisiensi.",
  "Riset Dominican University menunjukkan orang yang menulis tujuan belajar spesifik 42% lebih mungkin mencapainya.",
  "Fenomena 'tip of the tongue' terjadi karena otak sudah menemukan memori tapi jalur retrieval-nya terblokir sementara.",
  "Otak memproses informasi negatif lebih cepat dibanding positif — ini disebut negativity bias (Baumeister et al.).",
  "Riset University of Michigan: berjalan di alam selama 20 menit meningkatkan memori kerja hingga 20%.",
  "Otak menghasilkan gelombang theta saat dalam state 'flow' — kondisi optimal untuk deep focus learning.",
  "Tidur siang 20 menit setelah sesi belajar terbukti meningkatkan konsolidasi memori secara signifikan.",
  "Generation effect: informasi yang kamu hasilkan sendiri (bukan sekadar dibaca) jauh lebih mudah diingat.",
  "Glukosa adalah bahan bakar utama otak — kadar gula darah rendah langsung menurunkan konsentrasi belajar.",
  "Setiap kali kamu mengingat sebuah memori, otak merekonstruksinya ulang — proses ini disebut reconsolidation.",
  "Otak bisa membentuk memori baru bahkan saat tidur nyenyak non-REM stage 3 menurut riset di jurnal Nature.",
  "Rata-rata orang mengecek ponsel sekitar 96 kali per hari menurut studi Asurion — tiap cek butuh waktu refokus.",
  "Serial position effect: kita cenderung paling mengingat informasi di awal (primacy) dan akhir (recency) daftar.",
  "Context-dependent memory: belajar di tempat yang mirip ruang ujian bisa meningkatkan recall saat ujian berlangsung.",
  "Otak bisa lebih kreatif saat sedikit lelah karena kontrol inhibisi menurun — ini disebut inspiration paradox.",
  "Musik dengan tempo 60-70 BPM dapat membantu menyinkronkan gelombang otak alpha untuk konsentrasi optimal.",
  "Neuron bermyelin bisa mentransmisikan sinyal dengan kecepatan hingga 120 meter per detik.",
  "Default mode network otak aktif saat melamun — dan ternyata berperan penting dalam konsolidasi memori.",
  "Riset Erickson et al. di PNAS: latihan aerobik rutin selama setahun bisa meningkatkan volume hippocampus hingga 2%.",
  "Testing effect ternyata lebih kuat ketika kuis dilakukan setelah jeda waktu, bukan langsung setelah baca.",
  "Penelitian menunjukkan aroma kopi saja (tanpa diminum) sudah bisa meningkatkan performa di tes analitis.",
  "Riset UC Davis: rasa penasaran (curiosity) mengaktifkan sirkuit reward dopamin yang sama dengan makanan enak.",
  "Cahaya biru dari layar menekan produksi melatonin secara signifikan, mengganggu kualitas tidur pasca belajar malam.",
  "Mimpi selama fase REM mungkin merupakan 'rehearsal' — otak memproses dan mengorganisir memori saat bermimpi.",
  "Belajar dengan interval (spaced practice) bisa meningkatkan retensi jangka panjang drastis dibanding belajar marathon.",
  "Prefrontal cortex — bagian otak untuk perencanaan dan pengambilan keputusan — paling aktif di pagi hari.",
  "Fenomena 'eureka moment' ditandai oleh lonjakan gelombang gamma di otak, terutama di lobus temporal kanan.",
  "Otak menghasilkan sekitar 12-25 watt listrik saat terjaga — cukup untuk menyalakan lampu LED kecil.",
  "Riset Roediger & Karpicke: mahasiswa yang mengerjakan practice test mengingat hampir 2x lipat dibanding yang hanya membaca ulang.",
  "Protein BDNF yang dihasilkan saat olahraga berperan penting dalam pembentukan dan penguatan memori baru.",
  "Amygdala (pusat emosi) bisa 'membajak' prefrontal cortex saat stres tinggi — ini penyebab mind-blank saat ujian.",
  "Riset Johns Hopkins: variasi kecil dalam metode latihan meningkatkan kecepatan penguasaan keterampilan baru.",
  "Otak manusia bisa mendeteksi perbedaan waktu sekecil 5 milidetik antara dua suara yang berbeda.",
  "Mahasiswa dengan growth mindset (percaya kecerdasan bisa berkembang) cenderung mendapat hasil belajar yang lebih baik.",
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
  const { subjects, content } = useScopedData();
  const scopeCtx = useOptionalScope();
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const calc = () => calcOverall(getAllProgress(), subjects, content);
    setOverallProgress(calc());

    const handleSync = () => setOverallProgress(calc());
    window.addEventListener("hs-progress-synced", handleSync);
    window.addEventListener("hs-progress-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("hs-progress-synced", handleSync);
      window.removeEventListener("hs-progress-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [subjects, content]);

  const greetingKey = useMemo(() => getGreetingKey(), []);
  const motivation = useMemo(
    () => getMotivation(overallProgress),
    [overallProgress]
  );
  const dateStr = useMemo(() => getFormattedDate(), []);

  // Scope-aware tips & fun facts
  const isUas = scopeCtx?.scope.examPeriod === "uas";
  const tips = isUas ? TIPS_UAS : TIPS_UTS;
  const funFacts = isUas ? FUN_FACTS_UAS : FUN_FACTS_UTS;

  // 6-hour rotation for tips & fun facts
  const rotationIndex = Math.floor(Date.now() / (6 * 3600 * 1000));
  const tip = tips[rotationIndex % tips.length];
  const funFact = funFacts[rotationIndex % funFacts.length];

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

      {/* Divider with scope context */}
      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        {scopeCtx && (
          <span className="text-[10px] text-muted-foreground/30 whitespace-nowrap">
            {scopeFullLabel(scopeCtx.scope)}
          </span>
        )}
      </div>

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
