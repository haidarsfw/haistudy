"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useVoiceRoom } from "@/hooks/use-voice-room";

type VoiceContextType = ReturnType<typeof useVoiceRoom>;

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const voiceRoom = useVoiceRoom();
  return (
    <VoiceContext.Provider value={voiceRoom}>{children}</VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextType {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error("useVoice must be used within VoiceProvider");
  }
  return ctx;
}
