"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useChat } from "@/hooks/use-chat";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { getDeviceId } from "@/lib/auth/device";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { PinnedMessages } from "./pinned-messages";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import type { ChatMessage } from "@/types";
import { toast } from "sonner";
import { sounds } from "@/lib/sounds";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export function ChatPanel({ isOpen, onClose, onUnreadChange }: ChatPanelProps) {
  const { session } = useSession();
  const {
    messages,
    pinnedMessages,
    pinnedIds,
    isLoading,
    isSending,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    clearChat,
    pinMessage,
    unpinMessage,
  } = useChat();
  const { users } = useOnlineUsers();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Track unread - when panel is open, messages are "read"
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      onUnreadChange?.(0);
    }
  }, [isOpen, messages.length, onUnreadChange]);

  const handleSend = async (
    content: string,
    reply?: { id: string; name: string; content: string } | null
  ) => {
    try {
      await sendMessage(content, reply);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim pesan"
      );
      throw error;
    }
  };

  const handleSendImage = async (file: File, caption?: string, replyTo?: { id: string; name: string; content: string }) => {
    try {
      await sendImage(file, caption, replyTo);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim gambar"
      );
      throw error;
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    try {
      await sendAudio(blob);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengirim voice note"
      );
      throw error;
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      toast.success("Pesan dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus pesan"
      );
    }
  };

  const handlePin = async (messageId: string) => {
    try {
      await pinMessage(messageId);
      toast.success("Pesan di-pin");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal pin pesan"
      );
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await unpinMessage(messageId);
      toast.success("Pin dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal unpin pesan"
      );
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Hapus semua pesan? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      await clearChat();
      toast.success("Semua pesan dihapus");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus pesan"
      );
    }
  };

  const onlineUserNames = users
    .filter((u) => !u.hideStatus)
    .map((u) => u.userName);

  if (!session) return null;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 sm:hidden"
            onClick={() => { sounds.click(); onClose(); }}
          />

          {/* Desktop backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 hidden bg-black/20 sm:block"
            onClick={() => { sounds.click(); onClose(); }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed right-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border-t border-border bg-background shadow-xl h-[80dvh] max-h-[calc(100dvh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-auto sm:right-0 sm:h-[calc(100vh-3.5rem)] sm:w-[380px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h2 className="text-sm font-semibold">Global Chat</h2>
                <p className="text-[10px] text-muted-foreground">
                  {users.filter((u) => !u.hideStatus).length} online
                </p>
              </div>
              {session.isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { sounds.click(); handleClearChat(); }}
                  title="Hapus semua pesan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { sounds.click(); onClose(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Pinned messages */}
            <PinnedMessages messages={pinnedMessages} />

            {/* Message list */}
            {isLoading ? (
              <div className="flex flex-1 flex-col gap-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="skeleton h-8 w-8 shrink-0 !rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <div className="skeleton h-3 w-20" />
                      <div className="skeleton h-4" style={{ width: `${60 + (i % 3) * 15}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <MessageList
                messages={messages}
                pinnedIds={pinnedIds}
                currentDeviceId={deviceId}
                isAdmin={session.isAdmin}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onPin={handlePin}
                onUnpin={handleUnpin}
                onImageClick={setPreviewImage}
              />
            )}

            {/* Input */}
            <MessageInput
              onSend={handleSend}
              onSendImage={handleSendImage}
              onSendAudio={handleSendAudio}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              disabled={isSending}
              onlineUserNames={onlineUserNames}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Image lightbox */}
    <MediaPreviewer src={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}
