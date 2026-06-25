"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

/**
 * Small search icon that expands into an inline text field. Used in each
 * admin leaderboard card header (Quiz, Most Active, Latihan Soal Score) so an
 * admin can jump straight to a user. Collapses back to an icon when cleared.
 */
export function InlineSearch({
  value,
  onChange,
  placeholder = "Cari nama...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open && !value) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => setOpen(true)}
        title="Cari pengguna"
        aria-label="Cari pengguna"
      >
        <Search className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-[140px] rounded-md border border-border bg-background pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary sm:w-[170px]"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onChange("");
              setOpen(false);
            }
          }}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground"
        onClick={() => {
          onChange("");
          setOpen(false);
        }}
        title="Tutup pencarian"
        aria-label="Tutup pencarian"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
