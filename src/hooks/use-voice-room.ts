"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import type { VoiceRoom } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

const JOIN_TIMEOUT_MS = 10_000;

interface UseVoiceRoomReturn {
  rooms: VoiceRoom[];
  activeRoom: VoiceRoom | null;
  loading: boolean;
  joining: boolean;
  isMuted: boolean;
  isLiveKitConfigured: boolean;
  livekitToken: string | null;
  livekitUrl: string | null;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  createRoom: (name: string, maxParticipants?: number) => Promise<{ id: string } | undefined>;
  lockRoom: (roomId: string, lock: boolean) => Promise<void>;
  toggleMute: () => void;
  refreshRooms: () => void;
}

export function useVoiceRoom(): UseVoiceRoomReturn {
  const { session } = useSession();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiveKitConfigured, setIsLiveKitConfigured] = useState(false);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

  // Fetch rooms
  const fetchRooms = useCallback(() => {
    fetch("/api/voice/rooms")
      .then((r) => r.json())
      .then((data) => setRooms(data.rooms || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Supabase Realtime subscription for participant changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel("voice-participants")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_participants",
        },
        () => {
          // Refetch rooms on any participant change
          fetchRooms();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [fetchRooms]);

  // Auto-leave on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeRoomId && session) {
        // Use sendBeacon for reliable cleanup
        const body = JSON.stringify({
          action: "leave",
          roomId: activeRoomId,
          licenseKey: session.licenseKey,
        });
        navigator.sendBeacon("/api/voice/rooms", body);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeRoomId, session]);

  // Join room
  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!session || joining) return;
      setJoining(true);

      try {
        // Leave current room first
        if (activeRoomId) {
          await fetch("/api/voice/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "leave",
              roomId: activeRoomId,
              licenseKey: session.licenseKey,
            }),
          });
        }

        // Join new room with timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), JOIN_TIMEOUT_MS);

        let joinRes: Response;
        try {
          joinRes = await fetch("/api/voice/rooms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "join",
              roomId,
              userName: session.name,
              licenseKey: session.licenseKey,
            }),
            signal: abortController.signal,
          });
        } catch (fetchError) {
          if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
            toast.error("Koneksi timeout. Coba lagi nanti.");
          } else {
            toast.error("Gagal bergabung ke room. Coba lagi.");
          }
          console.error("Join room fetch error:", fetchError);
          return;
        } finally {
          clearTimeout(timeoutId);
        }

        if (!joinRes.ok) {
          const err = await joinRes.json().catch(() => ({ error: "Unknown error" }));
          toast.error(err.error || "Gagal bergabung ke room. Coba lagi.");
          console.error("Join room error:", err.error);
          return;
        }

        // Get LiveKit token - separate try/catch so join is not rolled back
        try {
          const tokenRes = await fetch("/api/voice/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roomId,
              userName: session.name,
              licenseKey: session.licenseKey,
            }),
          });

          const tokenData = await tokenRes.json();
          setIsLiveKitConfigured(tokenData.configured);
          setLivekitToken(tokenData.token);
          setLivekitUrl(tokenData.url);
        } catch (tokenError) {
          console.error("Token fetch error:", tokenError);
          toast.error("Bergabung tanpa audio - gagal mendapatkan token.");
          setIsLiveKitConfigured(false);
          setLivekitToken(null);
          setLivekitUrl(null);
        }

        setActiveRoomId(roomId);
        setIsMuted(false);
        fetchRooms();
      } catch (error) {
        console.error("Join room error:", error);
        toast.error("Gagal bergabung ke room. Coba lagi.");
      } finally {
        setJoining(false);
      }
    },
    [session, joining, activeRoomId, fetchRooms]
  );

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (!session || !activeRoomId) return;

    try {
      await fetch("/api/voice/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave",
          roomId: activeRoomId,
          licenseKey: session.licenseKey,
        }),
      });
    } catch (error) {
      console.error("Leave room error:", error);
    }

    setActiveRoomId(null);
    setLivekitToken(null);
    setLivekitUrl(null);
    setIsMuted(false);
    fetchRooms();
  }, [session, activeRoomId, fetchRooms]);

  // Create custom room
  const createRoom = useCallback(
    async (name: string, maxParticipants = 8) => {
      if (!session) return;
      const res = await fetch("/api/voice/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name,
          maxParticipants,
          creatorId: session.licenseKey,
          creatorName: session.name,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create room");
      }
      const data = await res.json();
      fetchRooms();
      return data.room as { id: string };
    },
    [session, fetchRooms]
  );

  // Lock/unlock room
  const lockRoom = useCallback(
    async (roomId: string, lock: boolean) => {
      if (!session) return;
      await fetch("/api/voice/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lock ? "lock" : "unlock",
          roomId,
          licenseKey: session.licenseKey,
        }),
      });
      fetchRooms();
    },
    [session, fetchRooms]
  );

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return {
    rooms,
    activeRoom,
    loading,
    joining,
    isMuted,
    isLiveKitConfigured,
    livekitToken,
    livekitUrl,
    joinRoom,
    leaveRoom,
    createRoom,
    lockRoom,
    toggleMute,
    refreshRooms: fetchRooms,
  };
}
