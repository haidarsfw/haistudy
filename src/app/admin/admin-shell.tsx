"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { useVoice } from "@/components/providers/voice-provider";
import { usePresence } from "@/hooks/use-presence";
import { VoiceRoom } from "@/components/voice/voice-room";
import { VoiceMiniBar } from "@/components/voice/voice-mini-bar";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";

export function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const voice = useVoice();
  // Heartbeat presence so admins appear online to support chat users
  // (admin-shell is the only layout for /admin/* — does not wrap AppShell).
  usePresence(null);

  useEffect(() => {
    if (!isLoading && (!session || !session.isAdmin)) {
      router.push("/dashboard");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    document.title = "Admin Panel | haistudy";
  }, []);

  const handleLeave = useCallback(async () => {
    await voice.leaveRoom();
    sounds.leave();
    toast.success("Keluar dari voice room");
  }, [voice]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat admin...</p>
        </div>
      </div>
    );
  }

  if (!session?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {children}

      {/* Keep voice connection alive when admin is in a voice room */}
      {voice.activeRoom && (
        <>
          <div className="hidden" aria-hidden="true">
            <VoiceRoom
              room={voice.activeRoom}
              isMuted={voice.isMuted}
              isLiveKitConfigured={voice.isLiveKitConfigured}
              livekitToken={voice.livekitToken}
              livekitUrl={voice.livekitUrl}
              currentLicenseKey={session.licenseKey}
              onToggleMute={voice.toggleMute}
              onLeave={handleLeave}
            />
          </div>
          <VoiceMiniBar
            activeRoom={voice.activeRoom}
            isMuted={voice.isMuted}
            onToggleMute={voice.toggleMute}
            onLeave={handleLeave}
          />
        </>
      )}
    </div>
  );
}
