"use client";

import Link from "next/link";
import { Mic, ArrowRight } from "lucide-react";

export function VoiceRoomsWidget() {
  return (
    <Link
      href="/voice"
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 group"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Mic className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold">Voice Rooms</h3>
        <p className="text-xs text-muted-foreground">
          Belajar bareng via voice call
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
    </Link>
  );
}
