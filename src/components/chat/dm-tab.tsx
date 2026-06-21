"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { Plus, ArrowLeft, Crown, ShieldCheck, Pin } from "lucide-react";
import { useTranslation } from "@/components/providers/language-provider";
import { useSession } from "@/components/providers/session-provider";
import { useDmChat } from "@/hooks/use-dm-chat";
import { useAvatars } from "@/hooks/use-avatars";
import { generateDefaultAvatar } from "@/lib/avatar";
import { resolveRole, getRoleNameClass } from "@/lib/role-colors";
import { DmUserPicker } from "./dm-user-picker";
import { MessageInput } from "./message-input";
import { MessageBubble } from "./message-bubble";
import { MediaPreviewer } from "@/components/shared/media-previewer";
import { sounds } from "@/lib/sounds";
import { toast } from "@/components/ui/toast";
import type { ChatMessage, DmConversation, DmMessage } from "@/types";

type View = "list" | "picker" | "thread";

interface DmTabProps {
  pendingDmKey?: string | null;
  onDmKeyConsumed?: () => void;
}

// Adapt a DmMessage into the ChatMessage shape MessageBubble consumes. DMs are
// 1:1, so author identity is derived from the conversation: a message is either
// "mine" (the session user) or "theirs" (the conversation's other participant).
function dmToChatMessage(
  m: DmMessage,
  myKey: string,
  myName: string,
  conv: DmConversation | undefined
): ChatMessage {
  const mine = m.senderKey.toUpperCase() === myKey;
  // 1:1 DM → the other party is always conv.otherName (freshly resolved). Prefer
  // it over the per-message senderName, which can be a stale "Pengguna" fallback.
  const authorName = mine ? myName : conv?.otherName ?? m.senderName ?? "";
  const licenseKey = mine ? myKey : conv?.otherKey ?? null;
  const isAdmin = mine ? false : conv?.otherIsAdmin ?? false;
  const packageTier = mine ? undefined : conv?.otherTier ?? undefined;
  return {
    id: m.id,
    content: m.body,
    type: m.type,
    mediaUrl: m.mediaUrl ?? null,
    authorId: m.senderKey,
    authorName,
    authorClass: "",
    licenseKey,
    isAdmin,
    isTester: false,
    packageTier: packageTier ?? undefined,
    deleted: m.deleted ?? false,
    replyToId: m.replyToId ?? null,
    replyToName: m.replyToName ?? null,
    replyToContent: m.replyToBody ?? null,
    channel: "global",
    createdAt: m.createdAt,
  };
}

export function DmTab({ pendingDmKey, onDmKeyConsumed }: DmTabProps = {}) {
  const { t } = useTranslation();
  const { session } = useSession();
  const {
    myKey,
    directory,
    conversations,
    activeId,
    setActiveId,
    messages,
    otherLastReadAt,
    isLoadingDirectory,
    isLoadingMessages,
    isSending,
    fetchDirectory,
    openConversationWith,
    sendMessage,
    sendImage,
    sendAudio,
    deleteMessage,
    pinMessage,
    unpinMessage,
  } = useDmChat();

  const [view, setView] = useState<View>("list");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);
  const myName = session?.shortName ?? t("dm.you");

  // Resolve real PFPs for me + every conversation partner (list + open thread).
  const avatarKeys = useMemo(
    () =>
      [myKey, ...conversations.map((c) => c.otherKey)].filter(
        Boolean
      ) as string[],
    [myKey, conversations]
  );
  const avatars = useAvatars(avatarKeys);

  const adapted = useMemo(
    () => messages.map((m) => dmToChatMessage(m, myKey, myName, activeConv)),
    [messages, myKey, myName, activeConv]
  );
  const pinned = useMemo(
    () => messages.filter((m) => m.pinned && !m.deleted),
    [messages]
  );

  // Auto-scroll to newest message in the open thread.
  useEffect(() => {
    if (view === "thread") {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, view]);

  const openPicker = () => {
    sounds.click();
    fetchDirectory();
    setView("picker");
  };

  const handlePick = async (licenseKey: string) => {
    const id = await openConversationWith(licenseKey);
    if (id) {
      setView("thread");
    } else {
      toast.error(t("dm.vip_only"));
    }
  };

  // Issue 4d: open a thread directly when the profile popover requests a DM.
  // Consume once so re-renders don't re-trigger; guard against double-fire.
  const consumedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pendingDmKey || consumedKeyRef.current === pendingDmKey) return;
    consumedKeyRef.current = pendingDmKey;
    const key = pendingDmKey.toUpperCase();
    (async () => {
      const id = await openConversationWith(key);
      if (id) setView("thread");
      else toast.error(t("dm.vip_only"));
      onDmKeyConsumed?.();
    })();
  }, [pendingDmKey, openConversationWith, onDmKeyConsumed, t]);

  const openThread = (id: string) => {
    sounds.click();
    setActiveId(id);
    setReplyTo(null);
    setView("thread");
  };

  // Reuse the global composer's send contract.
  const handleSend = async (
    content: string,
    reply?: { id: string; name: string; content: string } | null
  ) => {
    try {
      await sendMessage(content, reply ?? null);
      setReplyTo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dm.send_error"));
      throw error;
    }
  };

  const handleSendImage = async (
    file: File,
    caption?: string,
    reply?: { id: string; name: string; content: string }
  ) => {
    try {
      await sendImage(file, caption, reply ?? null);
      setReplyTo(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dm.send_error"));
      throw error;
    }
  };

  const handleSendAudio = async (blob: Blob) => {
    try {
      await sendAudio(blob);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dm.send_error"));
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMessage(id);
  };

  // ── Picker view ──
  if (view === "picker") {
    return (
      <DmUserPicker
        directory={directory}
        isLoading={isLoadingDirectory}
        onPick={handlePick}
        onBack={() => setView("list")}
      />
    );
  }

  // ── Thread view ──
  if (view === "thread" && activeConv) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Thread header */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            onClick={() => { sounds.click(); setView("list"); }}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Image
            src={
              avatars.get(activeConv.otherKey?.toUpperCase() ?? "") ||
              generateDefaultAvatar(activeConv.otherName, 64)
            }
            alt={activeConv.otherName ?? ""}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={`truncate text-sm font-semibold ${getRoleNameClass(resolveRole({ isAdmin: activeConv.otherIsAdmin, packageTier: activeConv.otherTier ?? null }))}`}>
                {activeConv.otherName ?? t("dm.you")}
              </span>
              {activeConv.otherIsAdmin ? (
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />
              ) : (
                <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {activeConv.otherOnline ? t("dm.online") : t("dm.offline")}
            </span>
          </div>
        </div>

        {/* Pinned banner */}
        {pinned.length > 0 && (
          <div className="flex items-start gap-1.5 border-b border-border bg-primary/5 px-3 py-1.5">
            <Pin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <p className="truncate text-[11px] text-muted-foreground">
              {pinned[pinned.length - 1].body ||
                (pinned[pinned.length - 1].type === "image"
                  ? t("dm.image")
                  : t("dm.voice"))}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoadingMessages ? (
            <div className="flex flex-col gap-2 px-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`skeleton h-9 ${i % 2 ? "ml-auto w-2/3" : "w-1/2"} !rounded-2xl`}
                />
              ))}
            </div>
          ) : adapted.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("dm.start_conversation")}
            </p>
          ) : (
            adapted.map((cm, i) => {
              const dm = messages[i];
              const mine = cm.authorId.toUpperCase() === myKey;
              const prev = adapted[i - 1];
              const grouped = !!prev && prev.authorId === cm.authorId;
              // Read receipt for my own sent messages: blue once the other
              // participant's last-read pointer is at/after this message's time.
              const readState = mine
                ? otherLastReadAt && cm.createdAt <= otherLastReadAt
                  ? "read"
                  : "sent"
                : undefined;
              return (
                <MessageBubble
                  key={cm.id}
                  message={cm}
                  isOwn={mine}
                  isAdmin={session?.isAdmin || false}
                  isPinned={dm?.pinned ?? false}
                  onReply={setReplyTo}
                  onDelete={handleDelete}
                  onPin={pinMessage}
                  onUnpin={unpinMessage}
                  onImageClick={setPreviewImage}
                  avatarUrl={avatars.get(cm.licenseKey?.toUpperCase() ?? "")}
                  variant="dm"
                  grouped={grouped}
                  dmReadState={readState}
                  dmReadAt={otherLastReadAt}
                />
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Composer - reused global MessageInput (image + voice + reply) */}
        <MessageInput
          onSend={handleSend}
          onSendImage={handleSendImage}
          onSendAudio={handleSendAudio}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          disabled={isSending}
          isAdmin={session?.isAdmin || false}
        />

        <MediaPreviewer src={previewImage} onClose={() => setPreviewImage(null)} />
      </div>
    );
  }

  // ── List view (default) ──
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">{t("dm.title")}</span>
        <button
          onClick={openPicker}
          className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-transform active:scale-[0.97]"
        >
          <Plus className="h-3 w-3" />
          {t("dm.new")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{t("dm.no_conversations")}</p>
            <p className="text-xs text-muted-foreground">{t("dm.empty_hint")}</p>
          </div>
        ) : (
          <ul className="py-1">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openThread(c.id)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="relative shrink-0">
                    <Image
                      src={
                        avatars.get(c.otherKey?.toUpperCase() ?? "") ||
                        generateDefaultAvatar(c.otherName, 72)
                      }
                      alt={c.otherName ?? ""}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                      unoptimized
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        c.otherOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
                      }`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`truncate text-sm ${c.unread ? "font-bold" : "font-medium"} ${getRoleNameClass(resolveRole({ isAdmin: c.otherIsAdmin, packageTier: c.otherTier ?? null }))}`}>
                      {c.otherName ?? t("dm.you")}
                    </span>
                    {c.lastBody && (
                      <p className={`truncate text-[11px] ${c.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {c.lastBody}
                      </p>
                    )}
                  </div>
                  {c.unread && (
                    <span
                      className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-primary"
                      aria-label="Belum dibaca"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
