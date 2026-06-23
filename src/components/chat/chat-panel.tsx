"use client";

import { useState, useEffect, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { X, MessageCircle, Trash2, Crown, Lock, Send, UserCog } from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useIsMobile } from "@/hooks/use-is-mobile";
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
import { useChatUnread } from "@/hooks/use-chat-unread";
import { useNotifications } from "@/hooks/use-notifications";
import { useOnlineUsers } from "@/hooks/use-online-users";
import { getDeviceId } from "@/lib/auth/device";
import { canUseVipFeatures } from "@/lib/tier";
import { resolveRole } from "@/lib/role-colors";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { PinnedMessages } from "./pinned-messages";
import { DmTab } from "./dm-tab";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ChatChannel, ChatMessage } from "@/types";
import { toast } from "@/components/ui/toast";
import { sounds } from "@/lib/sounds";
import { isCropLocked } from "@/lib/crop-lock";
import { APP_EVENTS } from "@/lib/events";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  pendingDmKey?: string | null;
  onDmKeyConsumed?: () => void;
}

export function ChatPanel({ isOpen, onClose, onUnreadChange, pendingDmKey, onDmKeyConsumed }: ChatPanelProps) {
  const { session } = useSession();
  // Mobile: rise from the bottom (matches the bottom-nav button origin).
  // Desktop: slide in from the right (matches the right-side FAB).
  const isMobile = useIsMobile();
  // Drag-to-dismiss (mobile bottom-sheet): started only from header / handle.
  const dragControls = useDragControls();
  const startSheetDrag = (e: ReactPointerEvent) => {
    if (!isMobile) return;
    if ((e.target as HTMLElement).closest("button,a,input,textarea,[role='button']")) return;
    dragControls.start(e);
  };
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

  // Per-source unread, so each tab can show a red dot telling the user WHERE the
  // new message is (Global / VIP / DM). Reuses existing realtime state — no extra
  // polling. DM unread is derived from dm_message notifications.
  const { globalUnread, vipUnread } = useChatUnread();
  const { notifications } = useNotifications();
  const dmTabUnread = notifications.filter(
    (n) => n.type === "dm_message" && !n.read
  ).length;
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

  // Tell the always-on chat-unread watcher (useChatUnread) which channel is
  // being viewed, so the bottom-right red dot clears for that channel only.
  // null = panel closed or on the DM tab (DM unread is tracked separately).
  useEffect(() => {
    const active: ChatChannel | null = isOpen && tab === "chat" ? channel : null;
    window.dispatchEvent(
      new CustomEvent("hs:chat-active", { detail: { channel: active } })
    );
  }, [isOpen, tab, channel]);

  // Clear active state if the panel unmounts while open.
  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("hs:chat-active", { detail: { channel: null } })
      );
    };
  }, []);

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

  const handlePinnedJump = (messageId: string) => {
    window.dispatchEvent(
      new CustomEvent(APP_EVENTS.SCROLL_TO_MESSAGE, { detail: { messageId } })
    );
  };

  const onlineUserNames = users
    .filter((u) => !u.hideStatus)
    .map((u) => u.userName);

  // Build role map for mention coloring. Messages cover everyone who has posted
  // (including people currently offline); online users then override with fresh
  // ranks resolved server-side (/api/presence/roles), so someone who is online
  // but hasn't sent a message yet still shows their rank color in the @ list.
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
    for (const u of users) {
      map.set(
        u.userName.toLowerCase(),
        resolveRole({
          isAdmin: u.isAdmin,
          isTester: u.isTester,
          packageTier: u.packageTier,
        })
      );
    }
    return map;
  }, [messages, users]);

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
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.y > 90 || info.velocity.y > 500) onClose();
            }}
            className="fixed right-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border-t border-border bg-background shadow-xl h-[80dvh] max-h-[calc(100dvh-3.5rem)] rounded-t-2xl sm:top-14 sm:bottom-0 sm:right-0 sm:h-auto sm:w-[380px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            {/* Drag-to-dismiss grab handle (mobile bottom-sheet) */}
            <div
              onPointerDown={startSheetDrag}
              className="flex shrink-0 cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing sm:hidden"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            </div>

            {/* Header */}
            <div
              onPointerDown={startSheetDrag}
              className="flex touch-none items-center gap-3 border-b border-border px-4 py-3 sm:touch-auto"
            >
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
                {globalUnread > 0 && !(tab === "chat" && channel === "global") && (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
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
                {canVip && vipUnread > 0 && !(tab === "chat" && channel === "vip-lounge") && (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
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
                {dmTabUnread > 0 && tab !== "dm" && (
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
              </button>
            </div>

            {tab === "dm" ? (
              <DmTab pendingDmKey={pendingDmKey} onDmKeyConsumed={onDmKeyConsumed} />
            ) : (
              <>
                {/* Pinned messages */}
                <PinnedMessages messages={pinnedMessages} onJump={handlePinnedJump} />

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
                  key={channel}
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
    <Dialog open={profileOpen} onOpenChange={(o) => { if (!o && isCropLocked()) return; setProfileOpen(o); }}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("profile.edit_own")}</DialogTitle>
        </DialogHeader>
        <ProfileEditor onSaved={() => setProfileOpen(false)} />
      </DialogContent>
    </Dialog>
    </>
  );
}
