import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Faq } from "@/components/landing/faq";
import { SupportEmail } from "@/components/landing/support-email";
import { REFUND_FAQ } from "@/data/landing/refund";

export const metadata = {
  title: "Pengembalian Dana",
  description:
    "Kebijakan pengembalian dana haistudy: kapan uang kamu dibalikin, kapan tidak, dan cara mengajukannya.",
  alternates: { canonical: "/refund" },
};

// Refund-specific WhatsApp entry (the rest of the landing uses the generic
// pre-sale line) so the admin sees what the chat is about straight away.
const WA_REFUND =
  "https://wa.me/6287839256171?text=" +
  encodeURIComponent("Halo min, saya mau tanya soal pengembalian dana");

export default function RefundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 lg:px-6 lg:py-16">
      {/* FAQPage structured data — same pattern as the landing FAQ, reusing the
          REFUND_FAQ array as the single source. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: REFUND_FAQ.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali
      </Link>

      <h1 className="font-display text-2xl font-bold text-foreground">
        Pengembalian Dana
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Terakhir diperbarui: 17 Juli 2026
      </p>

      <p className="mt-6 text-sm leading-relaxed text-foreground/80 sm:text-[15px]">
        Pembelian haistudy bersifat final, karena begitu aksesnya aktif semua
        materinya langsung kebuka buat kamu. Tapi kalau ada yang salah di sisi
        pembayaran atau akses kamu, uangnya tetap kita balikin. Ini rinciannya.
      </p>

      <div className="mt-8">
        <Faq items={REFUND_FAQ} nudge={null} />
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center shadow-card sm:p-7">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Ada kendala sama pembayaran kamu?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Chat admin aja langsung. Kirim bukti transfer sama cerita singkat
          kendalanya, nanti kita cek dan beresin.
        </p>
        <a
          href={WA_REFUND}
          target="_blank"
          rel="noopener noreferrer"
          className="brand-gradient-bg mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <MessageCircle className="h-4 w-4" />
          Chat admin
        </a>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <span>Atau lewat email:</span>
          <SupportEmail />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Halaman ini bagian dari{" "}
        <Link
          href="/terms"
          className="text-primary underline-offset-4 hover:underline"
        >
          Ketentuan Layanan
        </Link>{" "}
        haistudy.
      </p>
    </div>
  );
}
