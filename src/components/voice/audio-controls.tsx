"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mic, MicOff, PhoneOff, Monitor, MonitorOff, Headphones, HeadphoneOff } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";

interface AudioControlsProps {
  isMuted: boolean;
  isDeafened?: boolean;
  isScreenSharing?: boolean;
  onToggleMute: () => void;
  onToggleDeafen?: () => void;
  onToggleScreenShare?: () => void;
  onLeave: () => void;
}

export function AudioControls({
  isMuted,
  isDeafened = false,
  isScreenSharing = false,
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onLeave,
}: AudioControlsProps) {
  const { t } = useTranslation();
  const isIOSSafari = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

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

      {onToggleDeafen && (
        <Button
          size="lg"
          variant={isDeafened ? "destructive" : "outline"}
          className="h-12 w-12 rounded-full p-0"
          onClick={() => { sounds.toggle(); onToggleDeafen(); }}
        >
          {isDeafened ? (
            <HeadphoneOff className="h-5 w-5" />
          ) : (
            <Headphones className="h-5 w-5" />
          )}
        </Button>
      )}

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
          <TooltipContent>{isIOSSafari ? t("voice.screen_share_not_supported") : t("voice.coming_soon")}</TooltipContent>
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
