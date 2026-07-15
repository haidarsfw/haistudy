import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { ScrollReveal } from "@/components/shared/scroll-reveal";
import { PricingSection } from "@/components/landing/pricing-section";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Comparison } from "@/components/landing/comparison";
import { TestimonialMarquee } from "@/components/landing/testimonial-marquee";

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
        <TestimonialMarquee />

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
