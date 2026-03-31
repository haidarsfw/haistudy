"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRoom } from "@/hooks/use-voice-room";

interface VoiceTriggerProps {
  onClick: () => void;
}

export function VoiceTrigger({ onClick }: VoiceTriggerProps) {
  const { activeRoom } = useVoiceRoom();

  return (
    <Button
      onClick={onClick}
      size="icon"
      variant="outline"
      className="fixed bottom-20 right-32 z-40 h-12 w-12 rounded-full border-primary/30 bg-background shadow-lg hover:bg-primary hover:text-primary-foreground sm:bottom-6 sm:right-34"
    >
      <Mic className="h-5 w-5" />

      {/* Active indicator */}
      {activeRoom && (
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
      )}
    </Button>
  );
}
