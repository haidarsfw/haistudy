import { Lock } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Akses Belum Kebuka",
  robots: { index: false, follow: false },
};

// Reached from /api/downloads/[file] in two different situations that need two
// different answers: no session at all (→ log in), or a PREVIEW session hitting
// gated material (→ they're already "in", so pitch the packages instead).
export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { reason } = await searchParams;
  const isPreview = reason === "preview";

  const body = isPreview
    ? "Kamu lagi mode preview, jadi materi yang satu ini masih kekunci. Ambil paketnya buat buka semua materinya."
    : "Materi ini cuma buat yang udah punya akses. Kalau kamu udah beli, tinggal login ya.";

  const primary = isPreview
    ? { href: "/#harga", label: "Lihat paket" }
    : { href: "/login", label: "Login" };
  const secondary = isPreview
    ? { href: "/preview", label: "Balik ke preview" }
    : { href: "/", label: "Beranda" };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>

        <h1 className="font-display text-xl font-bold text-foreground">
          Akses kamu belum kebuka
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={primary.href}
            className="brand-gradient-bg inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {primary.label}
          </Link>
          <Link
            href={secondary.href}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
