"use client";

import { AlertTriangle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAuthError, adminErrorMessage } from "@/lib/admin/admin-fetch";

/**
 * Inline error surface for admin data loads. Replaces the old silent-empty
 * behavior: an auth failure (expired session) shows a "Login ulang" link, any
 * other failure shows "Coba lagi". Never let the panel look like there's no data
 * when the real problem is a failed request.
 */
export function AdminErrorBanner({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const isAuth = error instanceof AdminAuthError;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{adminErrorMessage(error)}</span>
      {isAuth ? (
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-2.5 py-1 text-xs font-medium hover:bg-destructive/10"
        >
          <LogIn className="h-3.5 w-3.5" />
          Login ulang
        </a>
      ) : onRetry ? (
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}
