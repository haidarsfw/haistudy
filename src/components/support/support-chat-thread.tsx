"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import {
  useSupportChatThread,
  type SupportThreadMode,
} from "@/hooks/use-support-chat-thread";
import { setTitleBadge } from "@/lib/title-badge";
import type { SupportConversationSummary, SupportMessage } from "@/types";
import { SupportMessageList } from "./support-message-list";
import { SupportMessageInput } from "./support-message-input";
import { SupportImageLightbox } from "./support-image-lightbox";

interface Props {
  mode: SupportThreadMode;
  /** Conversation owner. For user mode, equals session.licenseKey. */
  licenseKey: string | null;
  /** When admin selects from sidebar — passes summary for header info. */
  ownerSummary?: SupportConversationSummary | null;
  /** Whether this thread is currently visible (for unread/title badge). */
  visible?: boolean;
  /** Empty state contents. */
  emptyState?: React.ReactNode;
  /** When recipient closes/reopens (mobile back, etc.). */
  onClose?: () => void;
}

export function SupportChatThread({
  mode,
  licenseKey,
  ownerSummary,
  visible = true,
  emptyState,
}: Props) {
  const { session } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);

  const thread = useSupportChatThread({ licenseKey, mode });

  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [editTarget, setEditTarget] = useState<SupportMessage | null>(null);

  /* ── Lightbox state ── */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const m of thread.messages) {
      if (m.deleted) continue;
      if (m.type === "image" && m.mediaUrl) urls.push(m.mediaUrl);
      else if (m.type === "text" && m.content.startsWith("[image]")) {
        urls.push(m.content.split("\n")[0].slice(7));
      }
    }
    return urls;
  }, [thread.messages]);

  const openLightbox = useCallback(
    (url: string) => {
      const idx = imageUrls.indexOf(url);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [imageUrls]
  );

  /* ── Tab title badge ── */
  const lastSeenIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const last = thread.messages[thread.messages.length - 1];
    if (!last) return;
    if (lastSeenIdRef.current === null) {
      lastSeenIdRef.current = last.id;
      return;
    }
    if (lastSeenIdRef.current === last.id) return;
    lastSeenIdRef.current = last.id;

    // Only count messages from the OTHER side, when tab is hidden, when this
    // panel isn't visible.
    const isOther =
      (mode === "admin" && !last.isAdmin) ||
      (mode === "user" && last.isAdmin && !last.isSystem);
    const tabHidden =
      typeof document !== "undefined" && document.hidden === true;
    if (isOther && (tabHidden || !visible)) {
      // increment
      const m = document.title.match(/^\((\d+)\)/);
      const cur = m ? parseInt(m[1], 10) : 0;
      setTitleBadge(cur + 1);
    }
  }, [thread.messages, mode, visible]);

  /* ── Clear badge when tab becomes visible OR panel visible ── */
  useEffect(() => {
    if (visible && typeof document !== "undefined" && !document.hidden) {
      setTitleBadge(0);
    }
    const onVis = () => {
      if (!document.hidden && visible) setTitleBadge(0);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [visible]);

  /* ── Reset reply/edit when conversation changes ── */
  useEffect(() => {
    setReplyTo(null);
    setEditTarget(null);
  }, [licenseKey]);

  /* ── Handlers ── */
  const handleReply = useCallback((m: SupportMessage) => {
    setEditTarget(null);
    setReplyTo(m);
  }, []);

  const handleEdit = useCallback((m: SupportMessage) => {
    setReplyTo(null);
    setEditTarget(m);
  }, []);

  const handleSendText = useCallback(
    async (
      content: string,
      opts?: { replyTo?: { id: string; name: string; content: string } | null }
    ) => {
      await thread.sendMessage(content, { replyTo: opts?.replyTo ?? null });
    },
    [thread]
  );

  const handleSendImage = useCallback(
    async (
      url: string,
      caption: string,
      opts?: { replyTo?: { id: string; name: string; content: string } | null }
    ) => {
      await thread.sendMessage(caption, {
        type: "image",
        mediaUrl: url,
        replyTo: opts?.replyTo ?? null,
      });
    },
    [thread]
  );

  const handleSendAudio = useCallback(
    async (
      url: string,
      opts?: { replyTo?: { id: string; name: string; content: string } | null }
    ) => {
      await thread.sendMessage("", {
        type: "audio",
        mediaUrl: url,
        replyTo: opts?.replyTo ?? null,
      });
    },
    [thread]
  );

  /* ── Owner metadata for non-admin sender role coloring ── */
  const ownerMeta = useMemo(
    () =>
      ownerSummary
        ? {
            isTester: ownerSummary.isTester,
            packageTier: ownerSummary.packageTier ?? null,
          }
        : undefined,
    [ownerSummary]
  );

  const myKey = session?.licenseKey ?? null;
  const isMobile =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 640px)").matches
      : false;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col"
    >
      <SupportMessageList
        messages={thread.messages}
        myKey={myKey}
        myKind={thread.myKind}
        ownerMeta={ownerMeta}
        reactionsByMessage={thread.reactionsByMessage}
        receiptsByMessage={thread.receiptsByMessage}
        typing={thread.typing}
        onReply={handleReply}
        onEdit={handleEdit}
        onToggleReaction={thread.toggleReaction}
        isReactionInflight={thread.isReactionInflight}
        onImageClick={openLightbox}
        onRetry={thread.retryFailed}
        onRemoveFailed={thread.removeFailed}
        onBottomVisible={thread.markReadUpTo}
        emptyState={emptyState}
        loading={thread.loading}
      />

      <SupportMessageInput
        licenseKey={licenseKey}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editTarget={editTarget}
        onCancelEdit={() => setEditTarget(null)}
        onSendText={handleSendText}
        onSendImage={handleSendImage}
        onSendAudio={handleSendAudio}
        onSubmitEdit={thread.editMessage}
        onTyping={thread.notifyTyping}
        dropContainerRef={containerRef}
        isMobile={isMobile}
        disabled={!licenseKey}
      />

      <SupportImageLightbox
        images={imageUrls}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
