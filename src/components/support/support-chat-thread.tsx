"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import {
  useSupportChatThread,
  type SupportThreadMode,
} from "@/hooks/use-support-chat-thread";
import { useSupportPins } from "@/hooks/use-support-pins";
import { useSupportSearch } from "@/hooks/use-support-search";
import { useHiddenMessages } from "@/hooks/use-hidden-messages";
import { useDesktopNotification } from "@/hooks/use-desktop-notification";
import { setTitleBadge } from "@/lib/title-badge";
import { toast } from "sonner";
import type { SupportConversationSummary, SupportMessage } from "@/types";
import { SupportMessageList } from "./support-message-list";
import { SupportMessageInput } from "./support-message-input";
import { SupportImageLightbox } from "./support-image-lightbox";
import { SupportSearchBar } from "./support-search-bar";
import { SupportConfirmDialog } from "./support-confirm-dialog";
import { SupportMessageInfo } from "./support-message-info";

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
}

export function SupportChatThread({
  mode,
  licenseKey,
  ownerSummary,
  visible = true,
  emptyState,
}: Props) {
  const { session } = useSession();
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const messageListScrollRef = useRef<HTMLDivElement>(null);

  const thread = useSupportChatThread({ licenseKey, mode });
  const pinsHook = useSupportPins(licenseKey);
  const search = useSupportSearch(licenseKey);
  const hidden = useHiddenMessages(licenseKey);
  const desktopNotif = useDesktopNotification();

  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const [editTarget, setEditTarget] = useState<SupportMessage | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmUnsendTarget, setConfirmUnsendTarget] =
    useState<SupportMessage | null>(null);
  const [infoTarget, setInfoTarget] = useState<SupportMessage | null>(null);

  /* ── Lightbox state ── */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const m of thread.messages) {
      if (m.deleted || hidden.isHidden(m.id)) continue;
      if (m.type === "image" && m.mediaUrl) urls.push(m.mediaUrl);
      else if (m.type === "text" && m.content.startsWith("[image]")) {
        urls.push(m.content.split("\n")[0].slice(7));
      }
    }
    return urls;
  }, [thread.messages, hidden]);

  const openLightbox = useCallback(
    (url: string) => {
      const idx = imageUrls.indexOf(url);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [imageUrls]
  );

  /* ── Tab title badge + desktop notification ── */
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

    // Only react to messages from the OTHER side
    const isOther =
      (mode === "admin" && !last.isAdmin) ||
      (mode === "user" && last.isAdmin && !last.isSystem);
    const tabHidden =
      typeof document !== "undefined" && document.hidden === true;

    if (isOther && (tabHidden || !visible)) {
      // increment title badge
      const m = document.title.match(/^\((\d+)\)/);
      const cur = m ? parseInt(m[1], 10) : 0;
      setTitleBadge(cur + 1);

      // OS-level notification (opt-in)
      const preview =
        last.type === "image"
          ? t("support.image_label")
          : last.type === "audio"
            ? t("support.audio_label")
            : last.content.slice(0, 100);
      desktopNotif.notify({
        title: `${last.senderName}${last.isAdmin ? " (Admin)" : ""}`,
        body: preview,
        tag: `support-${licenseKey ?? "unknown"}`,
        onClick: () => {
          window.focus();
        },
      });
    }
  }, [thread.messages, mode, visible, licenseKey, desktopNotif, t]);

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

  /* ── Reset reply/edit/search when conversation changes ── */
  useEffect(() => {
    setReplyTo(null);
    setEditTarget(null);
    setSearchOpen(false);
    setInfoTarget(null);
    setConfirmUnsendTarget(null);
  }, [licenseKey]);

  /* ── Scroll-to-message helper for search jump ── */
  const scrollToMessage = useCallback((id: string) => {
    const el = document.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("animate-pulse");
      setTimeout(() => el.classList.remove("animate-pulse"), 1500);
    }
  }, []);

  /* ── Action handlers ── */
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
      opts?: {
        replyTo?: { id: string; name: string; content: string } | null;
        isInternal?: boolean;
      }
    ) => {
      await thread.sendMessage(content, {
        replyTo: opts?.replyTo ?? null,
        isInternal: opts?.isInternal,
      });
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

  const handlePin = useCallback(
    async (id: string) => {
      const res = await pinsHook.pin(id);
      if (!res.ok) {
        toast.error(res.error ?? t("support.pinned_count_full"));
      }
    },
    [pinsHook, t]
  );

  const handleUnpin = useCallback(
    async (id: string) => {
      const res = await pinsHook.unpin(id);
      if (!res.ok) toast.error(res.error ?? "Error");
    },
    [pinsHook]
  );

  const handleConfirmUnsend = useCallback(async () => {
    if (!confirmUnsendTarget) return;
    const id = confirmUnsendTarget.id;
    setConfirmUnsendTarget(null);
    const res = await thread.unsendMessage(id);
    if (!res.ok) toast.error(res.error ?? "Error");
  }, [confirmUnsendTarget, thread]);

  const handleSearchJump = useCallback(
    (id: string) => {
      setSearchOpen(false);
      requestAnimationFrame(() => scrollToMessage(id));
    },
    [scrollToMessage]
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
  const isAdminViewer = Boolean(session?.isAdmin);

  /* ── Reactive mobile detection (updates on rotate / resize) ── */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-col"
    >
      {/* Search toggle (icon button float-top-right) */}
      <div className="pointer-events-none absolute right-2 top-2 z-20 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSearchOpen((v) => !v)}
          className="pointer-events-auto h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background"
          aria-label={t("support.search_placeholder")}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <SupportSearchBar
        open={searchOpen}
        query={search.query}
        onQueryChange={search.setQuery}
        hits={search.hits}
        loading={search.loading}
        onClose={() => {
          setSearchOpen(false);
          search.clear();
        }}
        onJump={handleSearchJump}
      />

      <div ref={messageListScrollRef} className="flex flex-1 min-h-0 flex-col">
        <SupportMessageList
          messages={thread.messages}
          licenseKey={licenseKey}
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
          hiddenIds={hidden.hidden}
          pins={pinsHook.pins}
          isPinnedFn={pinsHook.isPinned}
          pinCapReached={pinsHook.capReached}
          onPin={isAdminViewer ? handlePin : undefined}
          onUnpin={isAdminViewer ? handleUnpin : undefined}
          onUnsend={
            isAdminViewer ? (msg) => setConfirmUnsendTarget(msg) : undefined
          }
          onHideForMe={(id) => hidden.hide(id)}
          onOpenInfo={(msg) => setInfoTarget(msg)}
        />
      </div>

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
        isAdmin={isAdminViewer && mode === "admin"}
      />

      <SupportImageLightbox
        images={imageUrls}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />

      <SupportConfirmDialog
        open={Boolean(confirmUnsendTarget)}
        onOpenChange={(open) => {
          if (!open) setConfirmUnsendTarget(null);
        }}
        title={t("support.confirm_unsend_title")}
        description={t("support.confirm_unsend_body")}
        confirmLabel={t("support.confirm_unsend_action")}
        cancelLabel="Batal"
        destructive
        onConfirm={handleConfirmUnsend}
      />

      <SupportMessageInfo
        open={Boolean(infoTarget)}
        message={infoTarget}
        reactions={
          infoTarget ? thread.reactionsByMessage.get(infoTarget.id) ?? [] : []
        }
        receipts={
          infoTarget ? thread.receiptsByMessage.get(infoTarget.id) ?? [] : []
        }
        onClose={() => setInfoTarget(null)}
      />
    </div>
  );
}
