import Link from "next/link";
import { FAQ } from "@/data/landing/faq";
import { PricingSection } from "@/components/landing/pricing-section";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { Comparison } from "@/components/landing/comparison";
import { TestimonialMarquee } from "@/components/landing/testimonial-marquee";
import { Faq } from "@/components/landing/faq";

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
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Pertanyaan Umum
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Hal-hal yang paling sering ditanyain sebelum gabung.
            </p>
          </div>
          <Faq />
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
