"use client";

import { useCallback, useState } from "react";
import { X, Mic, RefreshCw, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { usePreviewGuard } from "@/hooks/use-preview-guard";
import { RoomList } from "./room-list";
import { VoiceRoom } from "./voice-room";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";
import type { VoiceRoom as VoiceRoomType } from "@/types";

interface VoicePanelProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: VoiceRoomType[];
  activeRoom: VoiceRoomType | null;
  loading: boolean;
  joining: boolean;
  isMuted: boolean;
  isLiveKitConfigured: boolean;
  livekitToken: string | null;
  livekitUrl: string | null;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  createRoom: (name: string, maxParticipants?: number) => Promise<{ id: string } | undefined>;
  toggleMute: () => void;
  refreshRooms: () => void;
}

export function VoicePanel({
  isOpen,
  onClose,
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
  toggleMute,
  refreshRooms,
}: VoicePanelProps) {
  const { session } = useSession();
  const { guard } = usePreviewGuard();

  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const handleJoin = useCallback(
    async (roomId: string) => {
      try {
        await joinRoom(roomId);
        sounds.join();
        toast.success("Bergabung ke voice room!");
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Gagal bergabung ke room"
        );
      }
    },
    [joinRoom]
  );

  const handleLeave = useCallback(async () => {
    await leaveRoom();
    sounds.leave();
    toast.success("Keluar dari voice room");
  }, [leaveRoom]);

  const handleUpdate = useCallback(
    async (roomId: string, updates: { maxParticipants?: number; isLocked?: boolean }) => {
      try {
        const res = await fetch("/api/voice/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            roomId,
            licenseKey: session?.licenseKey,
            ...updates,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        refreshRooms();
      } catch {
        toast.error("Gagal mengubah pengaturan room");
      }
    },
    [session?.licenseKey, refreshRooms]
  );

  const handleDelete = useCallback(
    async (roomId: string) => {
      try {
        const res = await fetch("/api/voice/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            roomId,
            licenseKey: session?.licenseKey,
          }),
        });
        if (!res.ok) throw new Error("Failed to delete");
        refreshRooms();
        toast.success("Room dihapus");
      } catch {
        toast.error("Gagal menghapus room");
      }
    },
    [session?.licenseKey, refreshRooms]
  );

  if (!session) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={onClose}
          />

          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hidden bg-black/20 sm:block"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed right-0 bottom-0 z-50 flex w-full flex-col border-t border-border bg-background shadow-xl max-h-[calc(100vh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-auto sm:right-0 sm:h-[calc(100vh-3.5rem)] sm:w-[380px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Mic className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">Voice Rooms</h2>
                <p className="text-[10px] text-muted-foreground">
                  Ngobrol bareng teman satu angkatan
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { sounds.click(); refreshRooms(); }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { sounds.click(); onClose(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Create room form */}
              {showCreate ? (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="text-sm font-semibold">Buat Room</h3>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Nama room..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                    maxLength={30}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!newRoomName.trim()}
                      onClick={async () => {
                        try {
                          const newRoom = await createRoom(newRoomName.trim());
                          setNewRoomName("");
                          setShowCreate(false);
                          sounds.send();
                          toast.success("Room berhasil dibuat!");
                          // Auto-join the room we just created
                          if (newRoom?.id) {
                            await joinRoom(newRoom.id);
                          }
                        } catch (e) {
                          toast.error(
                            e instanceof Error ? e.message : "Gagal membuat room"
                          );
                        }
                      }}
                    >
                      Buat
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowCreate(false);
                        setNewRoomName("");
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => { if (!guard("preview.voice_blocked")) return; sounds.toggle(); setShowCreate(true); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Buat Room
                </Button>
              )}

              {/* Active room */}
              {activeRoom && (
                <VoiceRoom
                  room={activeRoom}
                  isMuted={isMuted}
                  isLiveKitConfigured={isLiveKitConfigured}
                  livekitToken={livekitToken}
                  livekitUrl={livekitUrl}
                  currentLicenseKey={session.licenseKey}
                  onToggleMute={toggleMute}
                  onLeave={handleLeave}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              )}

              {/* Room list (filter out the active room to prevent duplication) */}
              {(() => {
                const otherRooms = rooms.filter(r => r.id !== activeRoom?.id);
                if (otherRooms.length === 0 && !loading) return null;
                return (
                  <div>
                    <h3 className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {activeRoom ? "Room Lainnya" : "Pilih Room"}
                    </h3>
                    <RoomList
                      rooms={otherRooms}
                      activeRoomId={activeRoom?.id || null}
                      loading={loading}
                      joining={joining}
                      currentLicenseKey={session?.licenseKey}
                      onJoin={handleJoin}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
