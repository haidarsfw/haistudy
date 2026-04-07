"use client";

import type { ReactNode } from "react";
import { MusicProvider } from "@/components/providers/music-provider";
import { VoiceProvider } from "@/components/providers/voice-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <MusicProvider>
        <VoiceProvider>{children}</VoiceProvider>
      </MusicProvider>
    </TooltipProvider>
  );
}
