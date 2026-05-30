"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, LogIn, Loader2, Lock, Unlock, User, Settings, Trash2, Crown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { useSession } from "@/components/providers/session-provider";
import { canUseVipFeatures } from "@/lib/tier";
import type { VoiceRoom } from "@/types";
import { fadeInUp, hoverLift, tapScale } from "@/lib/motion";
import { useTranslation } from "@/components/providers/language-provider";
import { toast } from "@/components/ui/toast";

const VIP_LOUNGE_ID = "00000000-0000-4000-8000-000000000000";

interface RoomCardProps {
  room: VoiceRoom;
  isActive: boolean;
  joining: boolean;
  currentLicenseKey?: string;
  onJoin: (roomId: string) => void;
  onUpdate?: (roomId: string, updates: { maxParticipants?: number; isLocked?: boolean }) => void;
  onDelete?: (roomId: string) => void;
}

export function RoomCard({
  room,
  isActive,
  joining,
  currentLicenseKey,
  onJoin,
  onUpdate,
  onDelete,
}: RoomCardProps) {
  const isFull = room.participants.length >= room.maxParticipants;
  const hasParticipants = room.participants.length > 0;
  const isCreator = room.isCustom && room.creatorId === currentLicenseKey;
  const { t } = useTranslation();
  const { guard } = usePreviewGuard();
  const { session } = useSession();
  const canVip = canUseVipFeatures(session);
  const isVipLounge = room.id === VIP_LOUNGE_ID;
  const [showSettings, setShowSettings] = useState(false);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
    <Card
      className={`transition-all ${
        isActive
          ? "border-primary ring-2 ring-primary/20"
          : hasParticipants
            ? "border-green-500/30"
            : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{room.name}</h3>
              {isVipLounge && (
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              {room.isLocked && (
                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              {hasParticipants && (
                <Badge
                  variant="secondary"
                  className="gap-0.5 bg-green-500/10 text-green-600 dark:text-green-400"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  {t("voice.live")}
                </Badge>
              )}
              {room.isCustom && room.creatorName && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <User className="h-2.5 w-2.5" />
                  {room.creatorName}
                </span>
              )}
            </div>
            {room.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {room.description}
              </p>
            )}

            {/* Participant count */}
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {room.participants.length}/{room.maxParticipants}
              </span>
            </div>

            {/* Participant avatars */}
            {hasParticipants && (
              <div className="mt-2 flex items-center gap-1">
                {room.participants.slice(0, 5).map((p) => (
                  <Avatar key={p.id} className="h-6 w-6 border border-background">
                    <AvatarFallback className="text-[10px]">
                      {p.userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {room.participants.length > 5 && (
                  <span className="text-xs text-muted-foreground">
                    +{room.participants.length - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Creator settings button */}
            {isCreator && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}

            {!isActive && (
              <motion.div whileHover={hoverLift} whileTap={tapScale}>
              <Button
                size="sm"
                disabled={joining || isFull || room.isLocked || (isVipLounge && !canVip)}
                onClick={() => {
                  if (isVipLounge && !canVip) {
                    toast.info(t("voice.vip_only_toast"));
                    return;
                  }
                  if (guard("preview.voice_blocked")) onJoin(room.id);
                }}
                variant={isFull || (isVipLounge && !canVip) ? "outline" : "default"}
              >
                {joining ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : isVipLounge && !canVip ? (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isVipLounge && !canVip
                  ? t("voice.vip_lounge")
                  : room.isLocked ? t("voice.locked") : isFull ? t("voice.full") : t("voice.join")}
              </Button>
              </motion.div>
            )}

            {isActive && (
              <Badge variant="default" className="shrink-0">
                {t("voice.here")}
              </Badge>
            )}
          </div>
        </div>

        {/* Creator settings panel */}
        <AnimatePresence>
          {showSettings && isCreator && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-border space-y-3">
                {/* Max participants dropdown */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    {t("voice.max_participants")}
                  </label>
                  <Select
                    value={String(room.maxParticipants)}
                    onValueChange={(v) => onUpdate?.(room.id, { maxParticipants: Number(v) })}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lock/Unlock toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {room.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                    {room.isLocked ? t("voice.room_locked") : t("voice.room_unlocked")}
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onUpdate?.(room.id, { isLocked: !room.isLocked })}
                  >
                    {room.isLocked ? t("voice.open_room") : t("voice.lock_room")}
                  </Button>
                </div>

                {/* Delete room */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full h-7 text-xs gap-1.5"
                  onClick={() => onDelete?.(room.id)}
                >
                  <Trash2 className="h-3 w-3" />
                  {t("voice.delete_room")}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
    </motion.div>
  );
}
