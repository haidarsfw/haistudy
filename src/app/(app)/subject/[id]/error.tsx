"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/error-logging";

export default function SubjectErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error.message, error.stack);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Materi subject gagal dimuat
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Terjadi error saat memuat konten subject ini. Tab lain tetap aman.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/subjects">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              Daftar Subject
            </Button>
          </Link>
          <Button onClick={reset} size="sm" className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </Button>
        </div>
      </div>
    </div>
  );
}
