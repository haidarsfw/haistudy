"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

// The public support address isn't provisioned yet. We still SHOW the
// professional address, but a click opens a small note explaining it's not live
// and hands off to the admin's real inbox (no silent redirect, no browser
// alert()). Swap PERSONAL → support@haistudy.site once the mailbox exists.
const DISPLAY = "support@haistudy.site";
const PERSONAL = "haidar.surya@gmail.com";

export function SupportEmail() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
      >
        {DISPLAY}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Info email support"
          className="absolute bottom-full right-0 z-30 mb-2 w-[min(17rem,80vw)] rounded-xl border border-border bg-card p-3.5 text-left shadow-xl"
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            Email <span className="font-medium text-foreground">{DISPLAY}</span>{" "}
            belum aktif ya. Sementara, pesan kamu bakal diarahkan ke email admin.
          </p>
          <a
            href={`mailto:${PERSONAL}`}
            className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            Lanjut ke {PERSONAL}
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
