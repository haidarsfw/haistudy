import {
  BookOpen,
  Brain,
  ChevronDown,
  GraduationCap,
  Headphones,
  MessageCircle,
  Sparkles,
  Zap,
  Bot,
  Star,
  Bell,
  LifeBuoy,
} from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { PricingSection } from "@/components/landing/pricing-section";
import { LandingThemeToggle } from "@/components/landing/theme-toggle";
import { LandingColorPicker } from "@/components/landing/color-picker";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Materi Lengkap",
    desc: "Rangkuman, kisi-kisi, dan materi per modul untuk semua mata kuliah.",
  },
  {
    icon: Brain,
    title: "Flashcards Interaktif",
    desc: "Kartu bolak-balik 3D dengan shuffle dan progress tracking.",
  },
  {
    icon: Zap,
    title: "Quiz Berbobot",
    desc: "Soal per kategori dengan scoring otomatis dan leaderboard.",
  },
  {
    icon: Bot,
    title: "AI Study Assistant",
    desc: "Tanya materi kapan saja - AI menjawab berdasarkan konten kuliah dan fitur platform.",
  },
  {
    icon: MessageCircle,
    title: "Forum & Chat",
    desc: "Diskusi per mata kuliah, global chat real-time, @mention, voice message, dan reply.",
  },
  {
    icon: Headphones,
    title: "Voice Room",
    desc: "Belajar bareng via voice call langsung dari browser.",
  },
  {
    icon: Bell,
    title: "Notifikasi Real-time",
    desc: "Dapatkan notifikasi instan: mention, pengumuman, balasan forum. Klik untuk langsung navigate.",
  },
  {
    icon: LifeBuoy,
    title: "Live Chat Support",
    desc: "Hubungi admin langsung via live chat di dalam platform. Respon cepat dan history tersimpan.",
  },
];


const FAQ = [
  {
    q: "Apa itu haistudy?",
    a: "haistudy adalah platform belajar pintar untuk mahasiswa Binus University. Fokus persiapan UTS angkatan B29 Business Management dengan materi lengkap, quiz interaktif, flashcards, AI assistant, voice room, dan fitur kolaborasi.",
  },
  {
    q: "Bagaimana cara mendapatkan akses?",
    a: "Pilih paket yang sesuai (Share, Normal, atau VIP), lakukan pembayaran, dan kamu akan mendapatkan license key. Masukkan key tersebut di halaman login untuk mulai belajar.",
  },
  {
    q: "Apa bedanya paket Share dan Normal?",
    a: "Konten yang diakses sama persis. Perbedaannya: paket Share lebih murah tapi kamu wajib share link haistudy ke 1 teman (LE86: 1 teman di luar kelas). Normal langsung akses tanpa syarat share.",
  },
  {
    q: "Berapa device yang bisa digunakan?",
    a: "Maksimal 2 device (1 primary + 1 backup). Jika butuh lebih, silakan hubungi admin.",
  },
  {
    q: "Apakah bisa preview dulu sebelum beli?",
    a: 'Bisa! Klik tombol "Preview Gratis" untuk melihat demo platform tanpa login.',
  },
  {
    q: "Mata kuliah apa saja yang tersedia?",
    a: "Statistics I, Business Economics, CB: Kewarganegaraan, Accounting for Business, dan Foundations of AI.",
  },
  {
    q: "Apakah AI-nya akurat?",
    a: "AI menjawab berdasarkan materi kuliah yang ada di platform (flashcards, rangkuman, kisi-kisi) serta informasi lengkap tentang fitur-fitur haistudy. AI hanya membahas materi UTS dan penggunaan haistudy. Untuk kepastian, selalu cek dengan materi dosen.",
  },
  {
    q: "Apa fitur voice room?",
    a: "Voice room memungkinkan kamu belajar bareng via panggilan suara langsung dari browser. Bisa buat room sendiri, lock room, dan share screen.",
  },
  {
    q: "Bagaimana cara menghubungi admin?",
    a: "Buka menu Layanan Pelanggan di sidebar, lalu pilih tab Chat untuk live chat langsung dengan admin. Kamu juga bisa menghubungi via WhatsApp atau Instagram.",
  },
];

const TESTIMONIALS = [
  {
    name: "Cindy Baby Gracia",
    jurusan: "Business Management",
    ipk: "3.97",
    rating: 5,
    message:
      "Sangat terbantu dengan kelengkapan materi di aplikasi inii. Materinya gampang dimengerti dan nggak bikin pusingg. worth it sekalii \u2728\ud83d\ude4c\ud83c\udffc",
  },
  {
    name: "Erina Amanda Ardiningrum",
    jurusan: "Business Management",
    ipk: "3.80",
    rating: 5,
    message:
      "Webnya ngebantu banget kalo lagi mau baca-baca materi di waktu senggang, materi mudah dimengerti dan tersedia catatan mentor yang mempermudah pemahaman.",
  },
  {
    name: "Keiza Alma Larasati",
    jurusan: "Business Management",
    ipk: "3.73",
    rating: 5,
    message:
      "the only source i used for study dan materinya lengkap bgt. info tentang materi2 penting dan wajib dipelajarin was very helpful",
  },
  {
    name: "Sutan Jafni Indrayana",
    jurusan: "Business Management",
    ipk: "3.70",
    rating: 5,
    message:
      "Ngebantu bgt buat persiapan UTS dan UAS, materi yang dikasih lengkap dan mudah aku pahamin, kisi kisi yang dikasih juga banyak yang keluar pas ujian.",
  },
];

function DeviceMockup() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* MacBook frame */}
      <div className="relative rounded-xl border-[6px] border-foreground/10 bg-card shadow-2xl overflow-hidden aspect-[16/10]">
        {/* Screen content: simplified app UI */}
        <div className="w-full h-full bg-background p-3">
          {/* Mini sidebar + content */}
          <div className="flex h-full gap-2">
            <div className="hidden sm:flex w-12 flex-col gap-1.5 rounded-lg bg-muted p-1.5">
              <div className="h-1.5 w-full rounded bg-primary/40" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/20" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/20" />
              <div className="h-1.5 w-full rounded bg-muted-foreground/20" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-primary/30" />
              <div className="h-12 rounded-lg bg-primary/10" />
              <div className="grid grid-cols-2 gap-1.5">
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
                <div className="h-10 rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* MacBook base */}
      <div className="mx-auto mt-0 h-3 w-[80%] rounded-b-xl bg-foreground/8 border-x border-b border-foreground/10" />

      {/* iPhone overlay */}
      <div className="absolute -right-2 -bottom-2 sm:-right-6 sm:-bottom-4 w-20 sm:w-24 rounded-2xl border-[3px] border-foreground/10 bg-card shadow-xl overflow-hidden aspect-[9/19.5]">
        <div className="w-full h-full bg-background p-1.5 space-y-1">
          <div className="h-1.5 w-8 rounded bg-primary/30 mx-auto" />
          <div className="h-6 rounded bg-primary/10" />
          <div className="space-y-0.5">
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 rounded bg-muted" />
            <div className="h-4 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-noise flex min-h-screen flex-col bg-gradient-to-b from-background via-background to-muted/20 overflow-x-hidden">
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-full bg-card/60 backdrop-blur-md border border-border/50 px-3 py-2 shadow-lg">
        <LandingColorPicker />
        <div className="h-4 w-px bg-border/50" />
        <LandingThemeToggle />
      </div>
      {/* ── Hero ── */}
      <section className="relative flex flex-col lg:flex-row items-center gap-10 lg:gap-16 px-4 pb-16 pt-20 sm:pt-28 max-w-6xl mx-auto w-full">
        {/* Animated gradient mesh orbs */}
        {/* Animated gradient mesh orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="landing-orb-1 absolute top-10 left-1/4 h-72 w-72 rounded-full bg-primary/40 blur-3xl" />
          <div className="landing-orb-2 absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-primary/35 blur-3xl" />
          <div className="landing-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-primary/25" />
          <div className="landing-orb-3 absolute top-20 right-10 h-48 w-48 rounded-full bg-primary/30 blur-2xl" />
          <div className="landing-orb-2 absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
        </div>

        {/* Dot grid pattern */}
        <div className="landing-dot-grid absolute inset-0 -z-[5] pointer-events-none" />

        {/* Floating particles */}
        <div className="absolute inset-0 -z-[4] overflow-hidden pointer-events-none">
          <div className="landing-particle" style={{ left: '10%', bottom: '0', '--dur': '16s', '--del': '0s' } as React.CSSProperties} />
          <div className="landing-particle" style={{ left: '25%', bottom: '0', '--dur': '20s', '--del': '3s' } as React.CSSProperties} />
          <div className="landing-particle" style={{ left: '45%', bottom: '0', '--dur': '14s', '--del': '6s' } as React.CSSProperties} />
          <div className="landing-particle" style={{ left: '60%', bottom: '0', '--dur': '22s', '--del': '2s' } as React.CSSProperties} />
          <div className="landing-particle" style={{ left: '75%', bottom: '0', '--dur': '17s', '--del': '8s' } as React.CSSProperties} />
          <div className="landing-particle" style={{ left: '90%', bottom: '0', '--dur': '19s', '--del': '5s' } as React.CSSProperties} />
        </div>

        {/* Device mockups - show first on mobile, right on desktop */}
        <div className="flex-1 w-full max-w-lg lg:max-w-none order-first lg:order-last mockup-glow">
          <ScrollReveal delay={0.1}>
            <DeviceMockup />
          </ScrollReveal>
        </div>

        {/* Text content - show second on mobile, left on desktop */}
        <div className="flex-1 text-center lg:text-left order-last lg:order-first">
          <ScrollReveal>
            <div className="badge-shimmer inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Study Smarter, Together</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              <span
                className="landing-shimmer-text bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, var(--primary) 0%, var(--primary) 30%, oklch(0.75 0.15 145) 50%, var(--primary) 70%, var(--primary) 100%)",
                }}
              >
                hai
              </span>
              <span className="landing-title-glow text-foreground">study</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            <p className="mt-4 max-w-md text-lg text-muted-foreground mx-auto lg:mx-0">
              Platform belajar pintar untuk mahasiswa Binus. Saat ini fokus
              persiapan UTS B29 dengan materi lengkap, quiz interaktif, dan
              fitur belajar bersama.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center lg:justify-start">
              <Link
                href="/login"
                className="cta-glow inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 h-11 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <GraduationCap className="h-5 w-5" />
                Masuk
              </Link>
              <Link
                href="/preview"
                className="cta-secondary inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background/80 backdrop-blur-sm px-6 h-11 text-sm font-medium text-foreground transition-all hover:bg-muted hover:border-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <BookOpen className="h-5 w-5" />
                Preview Gratis
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section-glow-border relative bg-muted/30 px-4 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="landing-orb-2 absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="landing-orb-1 absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-primary/[0.08] blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Semua yang Kamu Butuhkan
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-muted-foreground">
            Fitur lengkap yang dirancang khusus untuk mahasiswa Binus B29
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.06}>
                <div className="feature-card-glow group rounded-xl border border-border bg-card p-5 hover:-translate-y-1 h-full">
                  <div className="relative mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 transition-all duration-300 group-hover:from-primary/25 group-hover:to-primary/10 group-hover:scale-110 group-hover:shadow-[0_0_24px_oklch(from_var(--primary)_l_c_h_/_0.2)]">
                    <f.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="font-heading font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {f.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Testimonials ── */}
      <section className="section-glow-border relative bg-muted/30 px-4 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="landing-orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/[0.08] blur-[80px]" />
        </div>
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Apa Kata Mereka
            </h2>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
              Pengalaman mahasiswa yang sudah menggunakan haistudy
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div
              className="mt-10 flex gap-4 overflow-x-auto py-6 -my-2 snap-x snap-mandatory scrollbar-hide px-6 -mx-6"
            >
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="testimonial-glass min-w-[240px] w-[260px] sm:min-w-[260px] sm:w-[280px] shrink-0 snap-center rounded-xl p-5 flex flex-col gap-3"
                >
                  {/* Rating */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < t.rating
                            ? "fill-primary text-primary"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  {/* Message */}
                  <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-5">
                    &ldquo;{t.message}&rdquo;
                  </p>
                  {/* Author */}
                  <div className="flex items-center gap-3 pt-1 mt-auto">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0 ring-1 ring-primary/10">
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.jurusan} &middot; IPK {t.ipk}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative px-4 py-16 sm:py-20">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="landing-orb-1 absolute top-20 right-1/4 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-heading text-2xl font-bold sm:text-3xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Pertanyaan Umum
          </h2>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <ScrollReveal key={item.q} delay={i * 0.05}>
                <details className="faq-smooth group rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/15 hover:shadow-sm">
                  <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div>
                    <div className="border-t border-border px-5 py-4 text-sm text-muted-foreground leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                </details>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="section-glow-border relative px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">
            made by{" "}
            <a
              href="https://instagram.com/haidarsfw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:text-primary transition-colors"
            >
              haidarsb
            </a>{" "}
            LE86
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span>&middot;</span>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
