"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ParticipantList } from "./participant-list";
import { AudioControls } from "./audio-controls";
import { Headphones, HeadphoneOff, WifiOff, Monitor, Settings, Lock, Unlock, Trash2, X, Maximize2, Volume2 } from "lucide-react";
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

/**
 * Attempt to play an audio element with retries.
 * Browsers sometimes block the first play() call; we retry a few times
 * with exponential backoff.
 */
async function tryPlayAudio(el: HTMLAudioElement, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await el.play();
      return; // success
    } catch {
      // Wait before retrying (100ms, 300ms, 600ms)
      await new Promise((r) => setTimeout(r, (i + 1) * 200));
    }
  }
  // All retries failed — audio is likely blocked by browser policy
  console.warn("Audio play blocked after retries — user interaction required");
}

/**
 * Resume all audio elements that we've attached to the DOM.
 * Called from user-initiated click handler so it has gesture context.
 */
function resumeAllAudio() {
  document.querySelectorAll('audio[data-lk-audio]').forEach((el) => {
    const audio = el as HTMLAudioElement;
    if (audio.paused) {
      audio.play().catch(() => {});
    }
  });
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
  const [isScreenExpanded, setIsScreenExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  // Always start as blocked — user MUST tap "Enable Audio" button
  // This guarantees startAudio() is called from a genuine user gesture
  const [audioBlocked, setAudioBlocked] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const wasMutedBeforeDeafen = useRef(false);
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const isCreator = room.creatorId === currentLicenseKey;
  const canScreenShare = typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  // LiveKit connection — complete rewrite for reliable two-way audio
  useEffect(() => {
    if (!isLiveKitConfigured || !livekitToken || !livekitUrl) return;

    let roomInstance: import("livekit-client").Room | null = null;
    let mounted = true;

    const connect = async () => {
      try {
        const { Room: LKRoom, RoomEvent, Track } = await import("livekit-client");

        // Suppress benign DataChannel errors from LiveKit SDK internals
        const origError = console.error;
        const origWarn = console.warn;
        console.error = (...args: unknown[]) => {
          if (typeof args[0] === "string" && (args[0].includes("DataChannel error") || args[0].includes("DataChannel") || args[0].includes("createOffer"))) return;
          origError.apply(console, args);
        };
        console.warn = (...args: unknown[]) => {
          if (typeof args[0] === "string" && (args[0].includes("DataChannel error") || args[0].includes("DataChannel") || args[0].includes("Unknown DataChannel"))) return;
          origWarn.apply(console, args);
        };

        roomInstance = new LKRoom({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            autoGainControl: true,
            noiseSuppression: true,
            echoCancellation: true,
          },
          publishDefaults: {
            audioPreset: { maxBitrate: 48_000 },
            screenShareEncoding: { maxBitrate: 5_000_000, maxFramerate: 15 },
          },
        });

        // ═══════════════════════════════════════════════════════
        // Set up ALL event listeners BEFORE connect()
        // This ensures we never miss any events during connection
        // ═══════════════════════════════════════════════════════

        // Audio playback status changes (browser autoplay policy)
        roomInstance.on(RoomEvent.AudioPlaybackStatusChanged, () => {
          if (!mounted || !roomInstance) return;
          const canPlay = roomInstance.canPlaybackAudio;
          console.log("[Voice] AudioPlaybackStatusChanged — canPlaybackAudio:", canPlay);
          if (canPlay) {
            setAudioBlocked(false);
          }
        });

        // Handle remote tracks — AUDIO is the critical part
        roomInstance.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (!mounted) return;

          if (track.kind === Track.Kind.Audio) {
            console.log("[Voice] TrackSubscribed audio from:", participant.identity);

            // Create audio element via LiveKit's attach() — it sets up the MediaStream
            const element = track.attach();

            // Tag it so we can find it later
            element.setAttribute("data-lk-audio", "true");
            element.id = `audio-${track.sid}`;

            // Critical: do NOT use display:none — some browsers deprioritize hidden media
            // Instead use position absolute + opacity 0 so it's "rendered" but invisible
            element.style.position = "absolute";
            element.style.width = "1px";
            element.style.height = "1px";
            element.style.opacity = "0";
            element.style.pointerEvents = "none";
            element.style.overflow = "hidden";

            // Ensure playback settings
            element.autoplay = true;
            element.setAttribute("playsinline", "");
            element.volume = 1.0;
            element.muted = false;

            // Append to body (not inside a React-managed tree to avoid cleanup issues)
            document.body.appendChild(element);

            // Explicitly try to play — this might fail due to autoplay policy
            // but that's OK — the "Enable Audio" button handles that
            tryPlayAudio(element).catch(() => {
              console.log("[Voice] Auto-play blocked for track", track.sid);
            });
          } else if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
            // Screen share from remote participant
            if (screenVideoRef.current) {
              track.attach(screenVideoRef.current);
              setScreenShareName(participant.identity || "Someone");
            }
          }
        });

        roomInstance.on(RoomEvent.TrackUnsubscribed, (track) => {
          if (!mounted) return;
          // Detach and remove all elements for this track
          track.detach().forEach((el) => el.remove());
          if (track.source === Track.Source.ScreenShare) {
            setScreenShareName(null);
          }
        });

        // Handle local track publish/unpublish for screen share self-preview
        roomInstance.on(RoomEvent.LocalTrackPublished, (pub) => {
          if (!mounted) return;
          if (pub.track?.source === Track.Source.ScreenShare && pub.track.kind === Track.Kind.Video) {
            if (localScreenRef.current) {
              pub.track.attach(localScreenRef.current);
            }
            setIsScreenSharing(true);
          }
        });

        roomInstance.on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (!mounted) return;
          if (pub.track?.source === Track.Source.ScreenShare) {
            pub.track?.detach();
            setIsScreenSharing(false);
          }
        });

        // Re-enable mic + resume audio after reconnection
        roomInstance.on(RoomEvent.Reconnected, () => {
          if (!mounted || !roomInstance || roomInstance.state !== "connected") return;
          roomInstance.localParticipant.setMicrophoneEnabled(!isMutedRef.current).catch(() => {});
          // Re-play all audio elements after reconnection
          resumeAllAudio();
        });

        // Track disconnection for UI state
        roomInstance.on(RoomEvent.Disconnected, () => {
          if (!mounted) return;
          console.log("[Voice] Disconnected from room");
          setIsConnected(false);
        });

        // ═══════════════════════════════════════════════════════
        // Now connect (all listeners are already registered)
        // ═══════════════════════════════════════════════════════

        await roomInstance.connect(livekitUrl, livekitToken);

        if (!mounted) {
          roomInstance.disconnect();
          return;
        }

        lkRoomRef.current = roomInstance;
        setIsConnected(true);

        console.log("[Voice] Connected to room. canPlaybackAudio:", roomInstance.canPlaybackAudio);

        // If browser already allows playback (e.g. Chrome with past interaction), unblock
        if (roomInstance.canPlaybackAudio) {
          setAudioBlocked(false);
        }

        // Wait for engine to be fully ready before publishing tracks.
        // room.connect() resolves before ICE/DTLS may finish, so publishing
        // immediately can fail with "engine not connected within timeout".
        const waitForEngine = (rm: import("livekit-client").Room, timeout = 10000) =>
          new Promise<void>((resolve, reject) => {
            if (rm.state === "connected" && rm.localParticipant.permissions?.canPublish) {
              resolve();
              return;
            }
            const timer = setTimeout(() => reject(new Error("Engine ready timeout")), timeout);
            const check = () => {
              if (rm.state === "connected" && rm.localParticipant.permissions?.canPublish) {
                clearTimeout(timer);
                rm.off(RoomEvent.Connected, check);
                resolve();
              }
            };
            rm.on(RoomEvent.Connected, check);
            check();
          });

        // Enable microphone after engine is ready (with retry)
        try {
          await waitForEngine(roomInstance);
          await roomInstance.localParticipant.setMicrophoneEnabled(!isMutedRef.current);
        } catch (micError) {
          const errName = (micError as Error)?.name || "";
          if (errName === "NotAllowedError") {
            console.warn("[Voice] Microphone permission denied by user");
          } else {
            console.warn("[Voice] Failed to enable mic, retrying in 2s:", micError);
            // Retry once after 2s
            setTimeout(async () => {
              try {
                if (mounted && roomInstance?.state === "connected") {
                  await roomInstance.localParticipant.setMicrophoneEnabled(!isMutedRef.current);
                  console.log("[Voice] Mic enabled on retry");
                }
              } catch (retryErr) {
                console.warn("[Voice] Mic retry also failed:", retryErr);
              }
            }, 2000);
          }
        }

        // Also handle any already-subscribed tracks (participants who joined before us)
        roomInstance.remoteParticipants.forEach((participant) => {
          participant.audioTrackPublications.forEach((pub) => {
            if (pub.isSubscribed && pub.track) {
              // Check if we already have an audio element for this track
              const existingEl = document.getElementById(`audio-${pub.track.sid}`);
              if (!existingEl) {
                const element = pub.track.attach();
                element.setAttribute("data-lk-audio", "true");
                element.id = `audio-${pub.track.sid}`;
                element.style.position = "absolute";
                element.style.width = "1px";
                element.style.height = "1px";
                element.style.opacity = "0";
                element.style.pointerEvents = "none";
                element.autoplay = true;
                element.setAttribute("playsinline", "");
                element.volume = 1.0;
                element.muted = false;
                document.body.appendChild(element);
                tryPlayAudio(element).catch(() => {});
              }
            }
          });
        });

      } catch (error) {
        console.error("[Voice] LiveKit connection error:", error);
      }
    };

    connect();

    return () => {
      mounted = false;
      // Clean up ALL our audio elements from document.body
      document.querySelectorAll('audio[data-lk-audio]').forEach((el) => el.remove());
      if (roomInstance) {
        roomInstance.disconnect();
      }
    };
  }, [isLiveKitConfigured, livekitToken, livekitUrl]);

  // Sync mute state with LiveKit
  useEffect(() => {
    const room = lkRoomRef.current;
    if (!room || room.state !== "connected") return;
    room.localParticipant.setMicrophoneEnabled(!isMuted).catch((err) => {
      console.warn("[Voice] Failed to toggle mic:", err);
    });
  }, [isMuted]);

  // Handle "Enable Audio" button click — MUST be from user gesture
  const handleEnableAudio = useCallback(async () => {
    const room = lkRoomRef.current;
    if (!room) return;

    try {
      // startAudio() MUST be called from a click/tap handler
      // This is the LiveKit-recommended way to unlock browser audio
      await room.startAudio();
      console.log("[Voice] startAudio() succeeded from user gesture");
    } catch (e) {
      console.warn("[Voice] startAudio() failed:", e);
    }

    // Also manually resume all audio elements — belt and suspenders
    resumeAllAudio();

    // Also try to resume AudioContext if it exists
    try {
      // Access the internal AudioContext and resume it
      // @ts-expect-error — accessing internal property
      const ctx = room.audioContext || (window as unknown as Record<string, unknown>).AudioContext;
      if (ctx && typeof ctx === "object" && "resume" in ctx) {
        await (ctx as AudioContext).resume();
      }
    } catch {
      // ignore
    }

    setAudioBlocked(false);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (!lkRoomRef.current) return;
    try {
      const enabled = !isScreenSharing;
      await lkRoomRef.current.localParticipant.setScreenShareEnabled(enabled, {
        audio: true,
        selfBrowserSurface: "include",
        systemAudio: "include",
        resolution: { width: 1920, height: 1080 },
      });
      // State update handled by LocalTrackPublished/Unpublished events
    } catch (error) {
      const errName = (error as Error)?.name || "";
      if (errName === "NotAllowedError") {
        console.warn("[Voice] Screen share permission denied by user");
      } else {
        console.error("[Voice] Screen share error:", error);
      }
      setIsScreenSharing(false);
    }
  }, [isScreenSharing]);

  // Toggle deafen (mute mic + block all incoming audio)
  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;

    // Mute/unmute all remote audio elements
    document.querySelectorAll('audio[data-lk-audio]').forEach((el) => {
      (el as HTMLAudioElement).muted = newDeafened;
    });

    if (newDeafened) {
      // Save current mute state and force mute mic
      wasMutedBeforeDeafen.current = isMuted;
      if (!isMuted) onToggleMute();
    } else {
      // Restore mic to pre-deafen state
      if (!wasMutedBeforeDeafen.current && isMuted) onToggleMute();
    }

    setIsDeafened(newDeafened);
  }, [isDeafened, isMuted, onToggleMute]);

  // Leave room: disconnect LiveKit, clean up audio elements, then notify parent
  const handleLeave = useCallback(() => {
    // Remove all audio elements we appended to document.body
    document.querySelectorAll('audio[data-lk-audio]').forEach((el) => el.remove());
    lkRoomRef.current?.disconnect();
    lkRoomRef.current = null;
    setIsConnected(false);
    onLeave();
  }, [onLeave]);

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

        {/* ═══ "TAP TO ENABLE AUDIO" — Always shown until user taps ═══ */}
        {/* This MUST be presented as a button so startAudio() runs from genuine user gesture */}
        {audioBlocked && isConnected && (
          <button
            onClick={handleEnableAudio}
            className="w-full rounded-xl border-2 border-dashed border-green-500/40 bg-green-500/5 hover:bg-green-500/15 p-4 flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.98] animate-pulse"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                {t("voice.enable_audio") || "Tap untuk Aktifkan Audio"}
              </p>
              <p className="text-[11px] text-green-600/70 dark:text-green-400/70">
                {t("voice.audio_blocked") || "Browser memblokir audio otomatis. Tap tombol ini untuk mendengar suara."}
              </p>
            </div>
          </button>
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

        {/* Remote screen share display — always in DOM so ref is never null */}
        <div className={screenShareName && !isScreenSharing
          ? (isScreenExpanded
            ? "fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
            : "space-y-2")
          : "hidden"
        }>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Monitor className="h-3.5 w-3.5" />
            <span>{t("voice.screen_shared_by")} {screenShareName}</span>
            {!isScreenExpanded && (
              <button
                onClick={() => setIsScreenExpanded(true)}
                className="ml-auto rounded p-1 hover:bg-muted transition-colors"
                title="Perbesar"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            {isScreenExpanded && (
              <button
                onClick={() => setIsScreenExpanded(false)}
                className="ml-auto rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            className={isScreenExpanded
              ? "max-w-full max-h-[calc(100vh-6rem)] object-contain rounded-lg"
              : "w-full rounded-lg border border-border bg-black aspect-video cursor-pointer"
            }
            onClick={() => !isScreenExpanded && setIsScreenExpanded(true)}
          />
        </div>

        {/* Audio controls */}
        <AudioControls
          isMuted={isMuted}
          isDeafened={isDeafened}
          isScreenSharing={isScreenSharing}
          onToggleMute={onToggleMute}
          onToggleDeafen={toggleDeafen}
          onToggleScreenShare={isLiveKitConfigured && canScreenShare ? toggleScreenShare : undefined}
          onLeave={handleLeave}
        />

        {/* Hidden audio elements container (not used directly, but ref kept for legacy compat) */}
        <div ref={roomRef} style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", opacity: 0, pointerEvents: "none" }} />
      </CardContent>
    </Card>
  );
}
