import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FileQuestion className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-muted-foreground">
          Halaman yang kamu cari tidak ada atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 h-10 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
