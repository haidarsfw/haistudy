"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "@/components/ui/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/error-logging";
import { useOptionalScope } from "@/components/providers/scope-provider";

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

  const scopeCtx = useOptionalScope();
  const subjectsHref = scopeCtx ? `/${scopeCtx.scopePath}/subjects` : "/subjects";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <div>
          <h2 className="flex items-center justify-center gap-2 font-heading text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            Materi subject gagal dimuat
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Terjadi error saat memuat konten subject ini. Tab lain tetap aman.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={subjectsHref}>
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
