"use client";

import { useState, useEffect, useMemo } from "react";
import { X, MessageCircle, Trash2, Crown, Lock, Send, UserCog } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useChat } from "@/hooks/use-chat";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { getDeviceId } from "@/lib/auth/device";
import { canUseVipFeatures } from "@/lib/tier";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { PinnedMessages } from "./pinned-messages";
import { DmTab } from "./dm-tab";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ChatChannel, ChatMessage } from "@/types";
import { toast } from "@/components/ui/toast";
import { sounds } from "@/lib/sounds";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  pendingDmKey?: string | null;
  onDmKeyConsumed?: () => void;
}

export function ChatPanel({ isOpen, onClose, onUnreadChange, pendingDmKey, onDmKeyConsumed }: ChatPanelProps) {
  const { session } = useSession();
  const { t } = useTranslation();
  const canVip = canUseVipFeatures(session);
  const [tab, setTab] = useState<"chat" | "dm">("chat");
  const [channel, setChannel] = useState<ChatChannel>("global");
  const {
    messages,
    pinnedMessages,
    pinnedIds,
    isLoading,
    isLoadingMore,
    hasMore,
    isSending,
    unreadCount,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    clearChat,
    pinMessage,
    unpinMessage,
    markAsRead,
    fetchMore,
  } = useChat(channel);
  const { users } = useOnlineUsers();
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // When a pending DM key arrives (profile popover "Kirim DM"), auto-switch to DM tab.
  useEffect(() => {
    if (pendingDmKey && isOpen) {
      setTab("dm");
    }
  }, [pendingDmKey, isOpen]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Track unread - mark as read when panel is open, pass unread count when closed
  useEffect(() => {
    if (isOpen) {
      markAsRead();
      onUnreadChange?.(0);
    } else {
      onUnreadChange?.(unreadCount);
    }
  }, [isOpen, unreadCount, markAsRead, onUnreadChange]);

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

  const onlineUserNames = users
    .filter((u) => !u.hideStatus)
    .map((u) => u.userName);

  // Build role map from messages for mention coloring
  const userRoleMap = useMemo(() => {
    const map = new Map<string, "admin" | "diamond" | "vip" | "tester" | "normal">();
    for (const m of messages) {
      const name = m.authorName.toLowerCase();
      if (map.has(name)) continue;
      if (m.isAdmin) map.set(name, "admin");
      else if (m.packageTier === "diamond") map.set(name, "diamond");
      else if (m.packageTier === "vip") map.set(name, "vip");
      else if (m.isTester) map.set(name, "tester");
      else map.set(name, "normal");
    }
    return map;
  }, [messages]);

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
            className="fixed right-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border-t border-border bg-background shadow-xl h-[80dvh] max-h-[calc(100dvh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-0 sm:right-0 sm:h-auto sm:w-[336px] lg:w-[400px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              {tab === "dm" ? (
                <Send className="h-5 w-5 text-primary" />
              ) : channel === "vip-lounge" ? (
                <Crown className="h-5 w-5 text-amber-500" />
              ) : (
                <MessageCircle className="h-5 w-5 text-primary" />
              )}
              <div className="flex-1">
                <h2 className="text-sm font-semibold">
                  {tab === "dm"
                    ? t("dm.title")
                    : channel === "vip-lounge"
                    ? t("chat.channel_vip")
                    : t("chat.channel_global")}
                </h2>
                {tab !== "dm" && (
                  <p className="text-[10px] text-muted-foreground">
                    {users.length} online
                  </p>
                )}
              </div>
              {tab === "chat" && session.isAdmin && (
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      title="Hapus semua pesan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  description="Hapus semua pesan? Tindakan ini tidak bisa dibatalkan."
                  onConfirm={async () => {
                    try {
                      await clearChat();
                      toast.success("Semua pesan dihapus");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Gagal menghapus pesan");
                    }
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title={t("profile.edit_own")}
                onClick={() => { sounds.click(); setProfileOpen(true); }}
              >
                <UserCog className="h-4 w-4" />
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

            {/* Tab + channel switcher */}
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
              <button
                onClick={() => {
                  if (tab !== "chat" || channel !== "global") {
                    sounds.click();
                    setTab("chat");
                    setChannel("global");
                  }
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  tab === "chat" && channel === "global"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3 w-3" />
                {t("chat.channel_global")}
              </button>
              <button
                onClick={() => {
                  if (!canVip) {
                    toast.info(t("chat.vip_lounge_locked"));
                    return;
                  }
                  sounds.click();
                  setTab("chat");
                  setChannel("vip-lounge");
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  tab === "chat" && channel === "vip-lounge"
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {canVip ? (
                  <Crown className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {t("chat.channel_vip")}
              </button>
              <button
                onClick={() => {
                  if (!canVip) {
                    toast.info(t("dm.vip_only"));
                    return;
                  }
                  if (tab !== "dm") { sounds.click(); setTab("dm"); }
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  tab === "dm"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {canVip ? (
                  <Send className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {t("dm.tab")}
              </button>
            </div>

            {tab === "dm" ? (
              <DmTab pendingDmKey={pendingDmKey} onDmKeyConsumed={onDmKeyConsumed} />
            ) : (
              <>
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
                    isOpen={isOpen}
                    onLoadMore={fetchMore}
                    isLoadingMore={isLoadingMore}
                    hasMore={hasMore}
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
                  isAdmin={session?.isAdmin || false}
                  userRoleMap={userRoleMap}
                />
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Image lightbox */}
    <MediaPreviewer src={previewImage} onClose={() => setPreviewImage(null)} />

    {/* Edit own profile */}
    <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("profile.edit_own")}</DialogTitle>
        </DialogHeader>
        <ProfileEditor />
      </DialogContent>
    </Dialog>
    </>
  );
}
