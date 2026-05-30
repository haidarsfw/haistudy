"use client";

import { useMemo } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Shield, Crown, Gem } from "lucide-react";
import type { VoiceParticipant } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ROLE_COLORS, resolveRole } from "@/lib/role-colors";
import { useAvatars } from "@/hooks/use-avatars";

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
  const avatarKeys = useMemo(
    () => participants.map((p) => p.licenseKey).filter(Boolean) as string[],
    [participants]
  );
  const avatarMap = useAvatars(avatarKeys);

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
        const avatarUrl = p.licenseKey
          ? avatarMap.get(p.licenseKey.toUpperCase()) ?? null
          : null;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 ${
              isMe ? "bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <div className="relative">
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={p.userName} />}
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
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`truncate text-sm font-semibold ${
                    ROLE_COLORS[
                      resolveRole({
                        isAdmin: p.isAdmin,
                        isTester: p.isTester,
                        packageTier: p.packageTier ?? null,
                      })
                    ].text
                  }`}
                >
                  {p.userName}
                </span>
                {isMe && (
                  <Badge variant="outline" className="text-[9px]">
                    Kamu
                  </Badge>
                )}
                {p.isAdmin && (
                  <Badge variant="admin-outline" className="gap-0.5 text-[9px] px-1 py-0">
                    <Shield className="h-2 w-2" />
                    Admin
                  </Badge>
                )}
                {p.packageTier === "diamond" && (
                  <Badge variant="diamond-outline" className="gap-0.5 text-[9px] px-1 py-0">
                    <Gem className="h-2 w-2" />
                    Diamond
                  </Badge>
                )}
                {(p.packageTier === "vip" || p.packageTier === "diamond") && (
                  <Badge variant="vip-outline" className="gap-0.5 text-[9px] px-1 py-0">
                    <Crown className="h-2 w-2" />
                    VIP
                  </Badge>
                )}
                {p.isTester && (
                  <Badge variant="tester-outline" className="text-[9px] px-1 py-0">
                    Tester
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
