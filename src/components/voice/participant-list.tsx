"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff } from "lucide-react";
import type { VoiceParticipant } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ParticipantListProps {
  participants: VoiceParticipant[];
  currentLicenseKey: string;
  isMuted: boolean;
}

export function ParticipantList({
  participants,
  currentLicenseKey,
  isMuted,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Belum ada peserta
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {participants.map((p) => {
        const isMe = p.licenseKey === currentLicenseKey;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
              isMe ? "bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {p.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Speaking indicator ring */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-background">
                {isMe && isMuted ? (
                  <MicOff className="h-2 w-2 text-destructive" />
                ) : (
                  <Mic className="h-2 w-2 text-green-500" />
                )}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">
                  {p.userName}
                </span>
                {isMe && (
                  <Badge variant="outline" className="text-[9px]">
                    Kamu
                  </Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(p.joinedAt), {
                  addSuffix: true,
                  locale: idLocale,
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
