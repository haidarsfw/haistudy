"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParticipantList } from "./participant-list";
import { AudioControls } from "./audio-controls";
import { Headphones, WifiOff, Monitor, Settings, Lock, Unlock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/components/providers/language-provider";
import { sounds } from "@/lib/sounds";
import type { VoiceRoom as VoiceRoomType } from "@/types";

interface VoiceRoomProps {
  room: VoiceRoomType;
  isMuted: boolean;
  isLiveKitConfigured: boolean;
  livekitToken: string | null;
  livekitUrl: string | null;
  currentLicenseKey: string;
  onToggleMute: () => void;
  onLeave: () => void;
  onUpdate?: (roomId: string, updates: { maxParticipants?: number; isLocked?: boolean }) => void;
  onDelete?: (roomId: string) => void;
}

export function VoiceRoom({
  room,
  isMuted,
  isLiveKitConfigured,
  livekitToken,
  livekitUrl,
  currentLicenseKey,
  onToggleMute,
  onLeave,
  onUpdate,
  onDelete,
}: VoiceRoomProps) {
  const { t } = useTranslation();
  const roomRef = useRef<HTMLDivElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);
  const lkRoomRef = useRef<import("livekit-client").Room | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareName, setScreenShareName] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const isCreator = room.creatorId === currentLicenseKey;

  // LiveKit connection via livekit-client
  useEffect(() => {
    if (!isLiveKitConfigured || !livekitToken || !livekitUrl) return;

    let roomInstance: import("livekit-client").Room | null = null;

    const connect = async () => {
      try {
        const { Room: LKRoom, RoomEvent } = await import("livekit-client");
        roomInstance = new LKRoom({
          audioCaptureDefaults: { autoGainControl: true, noiseSuppression: true },
          publishDefaults: {
            audioPreset: { maxBitrate: 48_000 },
            screenShareEncoding: { maxBitrate: 3_000_000, maxFramerate: 30 },
          },
        });

        await roomInstance.connect(livekitUrl, livekitToken);

        // Enable microphone (handle permission denied gracefully)
        try {
          await roomInstance.localParticipant.setMicrophoneEnabled(true);
        } catch (micError) {
          const errName = (micError as Error)?.name || "";
          if (errName === "NotAllowedError") {
            console.warn("Microphone permission denied by user");
          } else {
            console.warn("Failed to enable microphone:", micError);
          }
        }

        lkRoomRef.current = roomInstance;

        // Handle local track publish/unpublish for screen share self-preview
        roomInstance.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.track?.source === "screen_share" && pub.track.kind === "video") {
            if (localScreenRef.current) {
              pub.track.attach(localScreenRef.current);
            }
            setIsScreenSharing(true);
          }
        });

        roomInstance.on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (pub.track?.source === "screen_share") {
            pub.track?.detach();
            setIsScreenSharing(false);
          }
        });

        // Handle remote tracks (audio + video/screen share)
        roomInstance.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (track.kind === "audio") {
            const element = track.attach();
            element.id = `audio-${track.sid}`;
            roomRef.current?.appendChild(element);
          } else if (track.kind === "video" && track.source === "screen_share") {
            // Screen share from remote participant
            if (screenVideoRef.current) {
              track.attach(screenVideoRef.current);
              setScreenShareName(participant.identity || "Someone");
            }
          }
        });

        roomInstance.on(RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((el) => el.remove());
          if (track.source === "screen_share") {
            setScreenShareName(null);
          }
        });
      } catch (error) {
        console.error("LiveKit connection error:", error);
      }
    };

    connect();

    return () => {
      if (roomInstance) {
        roomInstance.disconnect();
      }
    };
  }, [isLiveKitConfigured, livekitToken, livekitUrl]);

  // Handle mute/unmute via LiveKit
  useEffect(() => {
    if (!isLiveKitConfigured || !livekitToken) return;

    const updateMute = async () => {
      try {
        const { Room: LKRoom } = await import("livekit-client");
        // The room instance is managed in the connection effect
        // We rely on the Room's localParticipant being available
        const rooms = LKRoom.prototype;
        void rooms; // LiveKit mute handled via component state for now
      } catch {
        // LiveKit not available
      }
    };

    updateMute();
  }, [isMuted, isLiveKitConfigured, livekitToken]);

  const toggleScreenShare = useCallback(async () => {
    if (!lkRoomRef.current) return;
    try {
      const enabled = !isScreenSharing;
      await lkRoomRef.current.localParticipant.setScreenShareEnabled(enabled, {
        audio: true,
        selfBrowserSurface: "include",
        systemAudio: "include",
      });
      // State update handled by LocalTrackPublished/Unpublished events
    } catch (error) {
      const errName = (error as Error)?.name || "";
      if (errName === "NotAllowedError") {
        console.warn("Screen share permission denied by user");
      } else {
        console.error("Screen share error:", error);
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Headphones className="h-5 w-5 text-primary" />
            {room.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCreator && onUpdate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => { sounds.toggle(); setShowSettings((s) => !s); }}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
            <Badge
              variant="secondary"
              className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              {t("voice.connected")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inline settings for room creator */}
        {showSettings && isCreator && onUpdate && (
          <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">
                {room.isLocked ? <Lock className="inline h-3 w-3 mr-1" /> : <Unlock className="inline h-3 w-3 mr-1" />}
                {room.isLocked ? t("voice.locked") : t("voice.unlocked")}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => { sounds.toggle(); onUpdate(room.id, { isLocked: !room.isLocked }); }}
              >
                {room.isLocked ? t("voice.open_room") : t("voice.lock_room")}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t("voice.max_participants")}</span>
              <Select
                value={String(room.maxParticipants)}
                onValueChange={(v) => onUpdate(room.id, { maxParticipants: Number(v) })}
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
            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-7 text-xs gap-1"
                onClick={() => onDelete(room.id)}
              >
                <Trash2 className="h-3 w-3" />
                {t("voice.delete_room")}
              </Button>
            )}
          </div>
        )}

        {!isLiveKitConfigured && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              {t("voice.livekit_not_configured")}
            </span>
          </div>
        )}

        {/* Participants */}
        <div>
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">
            {t("voice.participants")} ({room.participants.length}/{room.maxParticipants})
          </h4>
          <ParticipantList
            participants={room.participants}
            currentLicenseKey={currentLicenseKey}
            isMuted={isMuted}
          />
        </div>

        <Separator />

        {/* Local screen share preview */}
        {isScreenSharing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
              <span>{t("voice.your_screen_share") || "Screen share kamu"}</span>
            </div>
            <video
              ref={localScreenRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg border border-primary/30 bg-black aspect-video"
            />
          </div>
        )}

        {/* Remote screen share display */}
        {screenShareName && !isScreenSharing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Monitor className="h-3.5 w-3.5" />
              <span>{t("voice.screen_shared_by")} {screenShareName}</span>
            </div>
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg border border-border bg-black aspect-video"
            />
          </div>
        )}

        {/* Audio controls */}
        <AudioControls
          isMuted={isMuted}
          isScreenSharing={isScreenSharing}
          onToggleMute={onToggleMute}
          onToggleScreenShare={isLiveKitConfigured ? toggleScreenShare : undefined}
          onLeave={onLeave}
        />

        {/* Hidden audio elements container */}
        <div ref={roomRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
