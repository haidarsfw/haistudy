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
import { Footer } from "@/components/landing/footer";

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

        {/* ── Footer (brand lockup + nav + disclaimer + legal) ── */}
        <Footer />
      </main>
    </>
  );
}
