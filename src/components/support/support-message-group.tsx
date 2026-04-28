"use client";

import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
  SupportReaderKind,
} from "@/types";
import { SupportMessageBubble } from "./support-message-bubble";

interface AuthorMeta {
  isTester?: boolean;
  packageTier?: "share" | "normal" | "vip" | "diamond" | null;
}

interface Props {
  messages: SupportMessage[];
  myKey: string | null;
  myKind: SupportReaderKind;
  ownerMeta?: AuthorMeta;
  reactionsByMessage: Map<string, SupportReaction[]>;
  receiptsByMessage: Map<string, SupportReadReceipt[]>;
  knownIds: Set<string>;
  onReply: (msg: SupportMessage) => void;
  onEdit: (msg: SupportMessage) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  isReactionInflight: (id: string, emoji: string) => boolean;
  onImageClick?: (url: string) => void;
  onScrollToMessage?: (id: string) => void;
  onRetry?: (clientNonce: string) => void;
  onRemoveFailed?: (clientNonce: string) => void;
  highlightedId?: string | null;
  onUnsend?: (msg: SupportMessage) => void;
  onHideForMe?: (id: string) => void;
  onPin?: (id: string) => void;
  onUnpin?: (id: string) => void;
  isPinnedFn?: (id: string) => boolean;
  pinCapReached?: boolean;
  onOpenInfo?: (msg: SupportMessage) => void;
}

/**
 * Renders a contiguous batch of messages from the same sender within
 * SUPPORT_GROUP_WINDOW_MS. Only the first bubble shows the sender name.
 */
export function SupportMessageGroup({
  messages,
  myKey,
  myKind,
  ownerMeta,
  reactionsByMessage,
  receiptsByMessage,
  knownIds,
  onReply,
  onEdit,
  onToggleReaction,
  isReactionInflight,
  onImageClick,
  onScrollToMessage,
  onRetry,
  onRemoveFailed,
  highlightedId,
  onUnsend,
  onHideForMe,
  onPin,
  onUnpin,
  isPinnedFn,
  pinCapReached,
  onOpenInfo,
}: Props) {
  return (
    <div className="space-y-0.5">
      {messages.map((m, i) => {
        // Prefer authorLicenseKey-based check (works correctly when admin opens
        // user-side panel: myKind="user" but message authored by admin self).
        // Fallback to legacy logic for legacy rows pre-author_license_key column.
        const isOwn = m.isSystem
          ? false
          : m.authorLicenseKey
            ? m.authorLicenseKey === myKey
            : (myKind === "admin" && m.isAdmin) ||
              (myKind === "user" && !m.isAdmin && !m.isSystem);
        // Only the user side gets ownerMeta (admins are uniformly admin role).
        const authorMeta = m.isAdmin ? undefined : ownerMeta;
        return (
          <SupportMessageBubble
            key={m.id}
            message={m}
            isOwn={isOwn}
            authorMeta={authorMeta}
            reactions={reactionsByMessage.get(m.id) ?? []}
            receipts={receiptsByMessage.get(m.id) ?? []}
            myKey={myKey}
            myKind={myKind}
            showSender={i === 0}
            onReply={onReply}
            onEdit={onEdit}
            onToggleReaction={onToggleReaction}
            isReactionInflight={isReactionInflight}
            onImageClick={onImageClick}
            onReplyQuoteClick={onScrollToMessage}
            replyExists={m.replyToId ? knownIds.has(m.replyToId) : true}
            onRetry={
              m.clientNonce && onRetry ? () => onRetry(m.clientNonce!) : undefined
            }
            onRemoveFailed={
              m.clientNonce && onRemoveFailed
                ? () => onRemoveFailed(m.clientNonce!)
                : undefined
            }
            highlight={highlightedId === m.id}
            onUnsend={onUnsend}
            onHideForMe={onHideForMe}
            onPin={onPin}
            onUnpin={onUnpin}
            isPinned={isPinnedFn ? isPinnedFn(m.id) : false}
            pinCapReached={pinCapReached}
            onOpenInfo={onOpenInfo}
          />
        );
      })}
    </div>
  );
}
