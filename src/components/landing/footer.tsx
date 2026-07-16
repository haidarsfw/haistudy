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

const linkCls =
  "text-sm text-muted-foreground transition-colors hover:text-foreground";

/**
 * Landing footer — trimmed: brand lockup + socials on the left, two lean
 * columns (Tautan + Bantuan & Legal) on the right, then a bottom bar with the
 * (campus-agnostic) non-affiliation disclaimer + a clean copyright line.
 * Dark-only landing; tokens follow `.landing-root`.
 */
export function Footer() {
  return (
    <footer className="relative border-t border-border/60 px-4 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-8">
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

          {/* two lean columns */}
          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Tautan
              </h3>
              <ul className="mt-3.5 space-y-2.5">
                <li>
                  <a href="#fitur" className={linkCls}>
                    Fitur
                  </a>
                </li>
                <li>
                  <a href="#harga" className={linkCls}>
                    Harga
                  </a>
                </li>
                <li>
                  <a href="#faq" className={linkCls}>
                    FAQ
                  </a>
                </li>
                <li>
                  <Link href="/preview" className={linkCls}>
                    Preview Gratis
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                Bantuan &amp; Legal
              </h3>
              <ul className="mt-3.5 space-y-2.5">
                <li>
                  <a
                    href={WA_HELP}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkCls}
                  >
                    Chat WhatsApp
                  </a>
                </li>
                <li>
                  <SupportEmail />
                </li>
                <li>
                  <Link href="/privacy" className={linkCls}>
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className={linkCls}>
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/refund" className={linkCls}>
                    Pengembalian Dana
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* fine print + bottom bar */}
        <div className="mt-10 border-t border-border/50 pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground/85">
            haistudy adalah platform belajar independen yang dibuat oleh
            mahasiswa. Platform ini tidak terafiliasi, berafiliasi, didukung,
            atau disetujui oleh kampus, universitas, atau institusi mana pun.
            Seluruh materi kuliah, merek dagang, dan hak cipta terkait adalah
            milik pemiliknya masing-masing.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            &copy; 2026 haistudy. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
