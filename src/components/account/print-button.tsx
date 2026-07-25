"use client";

import { Printer } from "lucide-react";

/**
 * Hands the page to the browser's print dialog, which is also where "Save as
 * PDF" lives on every desktop platform. No export job, no queue, no file to
 * store and later have to delete.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
    >
      <Printer className="h-4 w-4" />
      Cetak / simpan PDF
    </button>
  );
}
