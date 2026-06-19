"use client";

import type { ReactNode } from "react";
import { VoiceProvider } from "@/components/providers/voice-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

// MusicProvider lives in the ROOT layout (not here) so the player keeps playing
// when the user moves between the scoped app and the admin panel - it only stops
// on logout. See src/app/layout.tsx.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <VoiceProvider>{children}</VoiceProvider>
    </TooltipProvider>
  );
}
