"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/error-logging";

export default function AppErrorBoundary({
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
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="font-heading text-lg font-semibold">
          Halaman gagal dimuat
        </h2>
        <p className="text-sm text-muted-foreground">
          Terjadi error saat memuat konten. Navigasi di samping masih aktif -
          coba ulangi atau pindah halaman.
        </p>
        <Button onClick={reset} size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}
