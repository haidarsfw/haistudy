import { ChevronDown, Star } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { PricingSection } from "@/components/landing/pricing-section";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Comparison } from "@/components/landing/comparison";

const FAQ = [
  {
    q: "Apa itu haistudy?",
    a: "haistudy adalah platform belajar pintar buat mahasiswa. Kamu dapat materi tiap mata kuliah, quiz interaktif, flashcards, AI assistant, voice room, dan komunitas belajar bareng, semua dalam satu platform per periode ujian.",
  },
  {
    q: "Bagaimana cara mendapatkan akses?",
    a: "Pilih paket (Share, Normal, VIP, atau Diamond) di halaman ini, isi formulir pembelian langsung di web haistudy, lakukan pembayaran (transfer bank / e-wallet / QRIS), lalu unggah bukti bayar di formulir. Admin akan memverifikasi dan mengaktifkan akun kamu.",
  },
  {
    q: "Apa bedanya paket Share dan Normal?",
    a: "Konten yang diakses sama persis. Perbedaannya: paket Share lebih murah tapi kamu wajib share link haistudy ke teman (LE86: 2 teman di luar kelas → Rp 20.000). Normal langsung akses tanpa syarat share.",
  },
  {
    q: "Apa keuntungan paket VIP?",
    a: "VIP membuka model AI eksklusif dengan prioritas dan limit chat lebih tinggi, VIP Lounge, Direct Message (DM) antar anggota, Snippet Library, warna aksen & highlight kustom, font premium, perks voice room, badge VIP, dan support lebih cepat.",
  },
  {
    q: "Berapa device yang bisa digunakan?",
    a: "Maksimal 2 device untuk Share/Normal, dan 3 device untuk VIP/Diamond.",
  },
  {
    q: "Apakah bisa preview dulu sebelum beli?",
    a: 'Bisa! Klik tombol "Preview Gratis" untuk melihat demo platform tanpa login.',
  },
];

const TESTIMONIALS = [
  {
    name: "Cindy Baby Gracia",
    jurusan: "B29 - Business Management",
    rating: 5,
    message:
      "Sangat terbantu dengan kelengkapan materi di aplikasi inii. Materinya gampang dimengerti dan nggak bikin pusingg. worth it sekalii ✨🙌🏼",
  },
  {
    name: "Reia Avrileamori",
    jurusan: "B29 - Business Management",
    rating: 5,
    message:
      "Latihan Soal bagus banget, jadi kebayang soal ujian nanti dan bisa simulasi dulu sebelum ujian beneran. Modul interaktif accounting jujur paling ngebantu.",
  },
  {
    name: "Keiza Alma Larasati",
    jurusan: "B29 - Business Management",
    rating: 5,
    message:
      "the only source i used for study dan materinya lengkap bgt. info tentang materi2 penting dan wajib dipelajarin was very helpful",
  },
  {
    name: "Sutan Jafni Indrayana",
    jurusan: "B29 - Business Management",
    rating: 5,
    message:
      "Ngebantu bgt buat persiapan ujian, materi yang dikasih lengkap dan mudah aku pahamin, kisi kisi yang dikasih juga banyak yang keluar pas ujian.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* FAQPage structured data — drives Google rich results + feeds AI/GEO
          engines the Q&A verbatim. Reuses the FAQ array above (single source). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <Header />

      <main className="overflow-x-hidden">
        <Hero />

        {/* ── Social proof strip ── */}
        <SocialProof />

        {/* ── How it works (live demos) ── */}
        <HowItWorks />

        {/* ▼ PENDING redesign (Batches 4-5): retinted to the new teal tokens
            but still the old layout, rebuilt section by section next. ▼ */}

        {/* ── Features showcase ── */}
        <FeatureShowcase />

        {/* ── Comparison ── */}
        <Comparison />

        {/* ── Pricing ── */}
        <div id="harga" className="scroll-mt-20">
          <PricingSection />
        </div>

        {/* ── Testimonials ── */}
        <section
          id="testimoni"
          className="relative scroll-mt-24 px-4 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-center text-2xl font-bold sm:text-3xl text-foreground">
              Apa Kata Mereka
            </h2>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
              Pengalaman mahasiswa yang sudah menggunakan haistudy
            </p>

            <div className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 -mx-6 py-6 [scrollbar-width:none]">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="flex w-[280px] shrink-0 snap-center flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-card"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < t.rating
                            ? "fill-[#f5b301] text-[#f5b301]"
                            : "text-muted-foreground/40"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <p className="line-clamp-5 text-sm italic leading-relaxed text-muted-foreground">
                    &ldquo;{t.message}&rdquo;
                  </p>
                  <div className="mt-auto flex items-center gap-3 pt-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-primary">
                      {t.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.jurusan}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="relative scroll-mt-20 px-4 py-14 sm:py-18">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-center text-2xl font-bold sm:text-3xl text-foreground">
              Pertanyaan Umum
            </h2>
            <div className="mt-10 space-y-3">
              {FAQ.map((item, i) => (
                <ScrollReveal key={item.q} delay={i * 0.05}>
                  <details className="group rounded-2xl border border-border bg-card shadow-card transition-colors hover:border-primary/20">
                    <summary className="flex cursor-pointer items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                      {item.q}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-border px-5 py-3.5 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </div>
                  </details>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Disclaimer ── */}
        <section className="border-t border-border/50 px-4 py-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs leading-relaxed text-muted-foreground/85">
              haistudy adalah platform belajar independen yang dibuat oleh
              mahasiswa. Platform ini tidak terafiliasi, berafiliasi, didukung,
              atau disetujui oleh BINUS University. Seluruh materi kuliah, merek
              dagang, dan hak cipta terkait adalah milik pemiliknya masing-masing.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="relative border-t border-border/60 px-4 py-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              made by{" "}
              <a
                href="https://instagram.com/haidarsfw"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground transition-colors hover:text-primary"
              >
                haidarsb
              </a>{" "}
              LE86
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Link
                href="/privacy"
                className="rounded transition-colors hover:text-foreground hover:underline"
              >
                Privacy Policy
              </Link>
              <span>&middot;</span>
              <Link
                href="/terms"
                className="rounded transition-colors hover:text-foreground hover:underline"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
