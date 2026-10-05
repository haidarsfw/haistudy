"use client";

import Link from "next/link";
import { Mic, ArrowRight } from "@/components/ui/icons";
import { useOptionalScope } from "@/components/providers/scope-provider";

export function VoiceRoomsWidget() {
  const scopeCtx = useOptionalScope();
  const href = scopeCtx ? `/${scopeCtx.scopePath}/voice` : "/voice";

  return (
    <Link
      href={href}
      className="surface surface-hover flex items-center gap-3 rounded-xl bg-card p-4 group"
    >
      <Mic className="h-5 w-5 shrink-0 text-primary" />
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
