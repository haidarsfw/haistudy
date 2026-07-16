import Link from "next/link";
import { Instagram, MessageCircle } from "lucide-react";
import { Logo } from "@/components/landing/logo";

// Support entry — same WhatsApp line as the header Bantuan button.
const WA_HELP =
  "https://wa.me/6287839256171?text=" +
  encodeURIComponent("Halo min, saya mau tanya soal haistudy");
const IG = "https://instagram.com/haidarsfw";

// Nav columns mirror the header nav (labels match landing.nav.* values) plus a
// legal column. Section anchors for in-page links, real routes for legal.
const COLS: {
  title: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Produk",
    links: [
      { label: "Cara Kerja", href: "#cara-kerja" },
      { label: "Fitur", href: "#fitur" },
      { label: "Harga", href: "#harga" },
    ],
  },
  {
    title: "Info",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Testimoni", href: "#testimoni" },
      { label: "Banding", href: "#banding" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

/**
 * Landing footer — brand lockup + tagline + socials, nav columns, and a bottom
 * bar carrying the BINUS non-affiliation disclaimer, the "made by" signature,
 * and the copyright line. Dark-only landing; tokens follow `.landing-root`.
 */
export function Footer() {
  return (
    <footer className="relative border-t border-border/60 px-4 py-12 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          {/* brand lockup */}
          <div className="max-w-xs">
            <a href="#beranda" aria-label="haistudy" className="inline-block">
              <Logo markSize={26} wordClassName="text-xl" />
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Platform belajar buat mahasiswa. Materi, latihan soal, AI, dan
              komunitas dalam satu tempat.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <a
                href={IG}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={WA_HELP}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* nav columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12 md:gap-16">
            {COLS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  {col.title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.href.startsWith("/") ? (
                        <Link
                          href={l.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {l.label}
                        </Link>
                      ) : (
                        <a
                          href={l.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* fine print + bottom bar */}
        <div className="mt-10 border-t border-border/50 pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground/85">
            haistudy adalah platform belajar independen yang dibuat oleh
            mahasiswa. Platform ini tidak terafiliasi, berafiliasi, didukung,
            atau disetujui oleh BINUS University. Seluruh materi kuliah, merek
            dagang, dan hak cipta terkait adalah milik pemiliknya masing-masing.
          </p>
          <div className="mt-5 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>
              made by{" "}
              <a
                href={IG}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground transition-colors hover:text-primary"
              >
                haidarsb
              </a>{" "}
              LE86
            </p>
            <p>&copy; 2026 haistudy</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
