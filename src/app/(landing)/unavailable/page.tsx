import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konten Tidak Tersedia",
  robots: { index: false, follow: false },
};

export default function UnavailablePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ShieldAlert className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold">
          Konten Tidak Tersedia
        </h2>
        <p className="text-sm text-muted-foreground">
          Kamu harus login terlebih dahulu untuk mengakses konten ini.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 h-10 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
