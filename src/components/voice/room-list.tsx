"use client";

import { RoomCard } from "./room-card";
import { Loader2 } from "lucide-react";
import type { VoiceRoom } from "@/types";

interface RoomListProps {
  rooms: VoiceRoom[];
  activeRoomId: string | null;
  loading: boolean;
  joining: boolean;
  currentLicenseKey?: string;
  onJoin: (roomId: string) => void;
  onUpdate?: (roomId: string, updates: { maxParticipants?: number; isLocked?: boolean }) => void;
  onDelete?: (roomId: string) => void;
}

export function RoomList({
  rooms,
  activeRoomId,
  loading,
  joining,
  currentLicenseKey,
  onJoin,
  onUpdate,
  onDelete,
}: RoomListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          isActive={room.id === activeRoomId}
          joining={joining}
          currentLicenseKey={currentLicenseKey}
          onJoin={onJoin}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
