import Link from "next/link";
import { Instagram, Linkedin } from "lucide-react";
import { Logo } from "@/components/landing/logo";
import { SupportEmail } from "@/components/landing/support-email";

// Support entry — same WhatsApp line as the header Bantuan button.
const WA_HELP =
  "https://wa.me/6287839256171?text=" +
  encodeURIComponent("Halo min, saya mau tanya soal haistudy");
const IG = "https://instagram.com/haidarsfw";
const LINKEDIN = "https://www.linkedin.com/in/haidarshofwan/";

// Link columns. Section anchors for in-page nav, real routes for pages.
// /refund is intentionally linked ahead of the page existing (built later).
const COLS: {
  title: string;
  links: { label: string; href: string }[];
}[] = [
  {
    title: "Produk",
    links: [
      { label: "Cara Kerja", href: "#cara-kerja" },
      { label: "Fitur", href: "#fitur" },
      { label: "Banding", href: "#banding" },
      { label: "Harga", href: "#harga" },
    ],
  },
  {
    title: "Info",
    links: [
      { label: "Testimoni", href: "#testimoni" },
      { label: "FAQ", href: "#faq" },
      { label: "Preview Gratis", href: "/preview" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Pengembalian Dana", href: "/refund" },
    ],
  },
];

/**
 * Landing footer — brand lockup + tagline + socials, three link columns, a
 * dedicated Bantuan (contact) column, and a bottom bar with the BINUS
 * non-affiliation disclaimer + a clean copyright line. Dark-only landing;
 * tokens follow `.landing-root`.
 */
export function Footer() {
  return (
    <footer className="relative border-t border-border/60 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:gap-8">
          {/* brand lockup */}
          <div className="max-w-xs">
            <a href="#beranda" aria-label="haistudy" className="inline-block">
              <Logo markSize={26} wordClassName="text-xl" />
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Platform belajar buat mahasiswa. Materi, latihan soal, AI, dan
              komunitas dalam satu tempat.
            </p>
            <div className="mt-5 flex items-center gap-2">
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
                href={LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* link + contact columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-10 lg:gap-16">
            {COLS.map((col) => (
              <div key={col.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  {col.title}
                </h3>
                <ul className="mt-3.5 space-y-2.5">
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

            {/* Bantuan (contact) — WhatsApp + the not-yet-live support email */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Bantuan
              </h3>
              <ul className="mt-3.5 space-y-2.5">
                <li>
                  <a
                    href={WA_HELP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Chat WhatsApp
                  </a>
                </li>
                <li>
                  <SupportEmail />
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* fine print + bottom bar */}
        <div className="mt-12 border-t border-border/50 pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground/85">
            haistudy adalah platform belajar independen yang dibuat oleh
            mahasiswa. Platform ini tidak terafiliasi, berafiliasi, didukung,
            atau disetujui oleh BINUS University. Seluruh materi kuliah, merek
            dagang, dan hak cipta terkait adalah milik pemiliknya masing-masing.
          </p>
          <p className="mt-5 text-xs text-muted-foreground">
            &copy; 2026 haistudy. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
