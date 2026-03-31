"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff, PhoneOff, Monitor, MonitorOff } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface AudioControlsProps {
  isMuted: boolean;
  isScreenSharing?: boolean;
  onToggleMute: () => void;
  onToggleScreenShare?: () => void;
  onLeave: () => void;
}

export function AudioControls({
  isMuted,
  isScreenSharing = false,
  onToggleMute,
  onToggleScreenShare,
  onLeave,
}: AudioControlsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        size="lg"
        variant={isMuted ? "destructive" : "outline"}
        className="h-12 w-12 rounded-full p-0"
        onClick={() => { sounds.toggle(); onToggleMute(); }}
      >
        {isMuted ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      {onToggleScreenShare ? (
        <Button
          size="lg"
          variant={isScreenSharing ? "default" : "outline"}
          className="h-12 w-12 rounded-full p-0"
          onClick={() => { sounds.toggle(); onToggleScreenShare(); }}
        >
          {isScreenSharing ? (
            <MonitorOff className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-input bg-background opacity-50 cursor-not-allowed"
          >
            <Monitor className="h-5 w-5" />
          </TooltipTrigger>
          <TooltipContent>{t("voice.coming_soon")}</TooltipContent>
        </Tooltip>
      )}

      <Button
        size="lg"
        variant="destructive"
        className="h-12 w-12 rounded-full p-0"
        onClick={() => { sounds.leave(); onLeave(); }}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  );
}
