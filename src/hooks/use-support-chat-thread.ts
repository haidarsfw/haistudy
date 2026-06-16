"use client";

import { useCallback } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useSupportMessages } from "@/hooks/use-support-messages";
import { useSupportReactions } from "@/hooks/use-support-reactions";
import { useSupportReadReceipts } from "@/hooks/use-support-read-receipts";
import { useSupportTyping } from "@/hooks/use-support-typing";
import { useSupportPresence } from "@/hooks/use-support-presence";
import type {
  SupportMessage,
  SupportReaction,
  SupportReadReceipt,
  SupportTypingState,
  SupportPresenceState,
  SupportReaderKind,
} from "@/types";

export type SupportThreadMode = "user" | "admin";

interface UseSupportChatThreadOptions {
  /**
   * Conversation owner's license key. For user mode this should equal session.licenseKey.
   * For admin mode this is the user's licenseKey selected from the sidebar.
   */
  licenseKey: string | null;
  mode: SupportThreadMode;
}

interface SendOptions {
  type?: "text" | "image" | "audio";
  mediaUrl?: string | null;
  replyTo?: { id: string; name: string; content: string } | null;
  isInternal?: boolean;
}

export interface UseSupportChatThreadResult {
  // data
  messages: SupportMessage[];
  reactionsByMessage: Map<string, SupportReaction[]>;
  receiptsByMessage: Map<string, SupportReadReceipt[]>;
  typing: SupportTypingState | null;
  presence: SupportPresenceState;
  loading: boolean;
  myKind: SupportReaderKind;
  myName: string;

  // actions
  sendMessage: (content: string, opts?: SendOptions) => Promise<SupportMessage | null>;
  editMessage: (id: string, content: string) => Promise<{
    ok: boolean;
    error?: string;
    code?: string;
  }>;
  unsendMessage: (id: string) => Promise<{ ok: boolean; error?: string }>;
  toggleReaction: (id: string, emoji: string) => Promise<void>;
  isReactionInflight: (id: string, emoji: string) => boolean;
  markReadUpTo: (messageId: string) => Promise<void>;
  notifyTyping: () => void;
  retryFailed: (clientNonce: string) => Promise<void>;
  removeFailed: (clientNonce: string) => void;
}

/**
 * Single composite hook that wires every concern of a support conversation.
 * Consumers (user panel + admin thread) import only this.
 */
export function useSupportChatThread({
  licenseKey,
  mode,
}: UseSupportChatThreadOptions): UseSupportChatThreadResult {
  const { session } = useSession();
  const myKind: SupportReaderKind = mode === "admin" ? "admin" : "user";
  const myName = session?.shortName ?? (mode === "admin" ? "Admin" : "User");

  const messagesHook = useSupportMessages(
    licenseKey,
    Boolean(session?.isAdmin)
  );
  const reactionsHook = useSupportReactions(licenseKey, session?.licenseKey ?? null);
  const receiptsHook = useSupportReadReceipts(licenseKey);
  const typingHook = useSupportTyping(
    licenseKey,
    myKind,
    session?.licenseKey ?? null
  );
  // For user side, presence target is "any admin" → pass null. For admin side,
  // presence target is the conversation owner.
  const presenceHook = useSupportPresence(
    mode === "admin" ? licenseKey : null,
    mode === "admin" ? "user" : "admin"
  );

  const sendMessage = useCallback(
    (content: string, opts?: SendOptions) =>
      messagesHook.sendMessage(content, myName, opts),
    [messagesHook, myName]
  );

  const retryFailed = useCallback(
    (cn: string) => messagesHook.retryFailed(cn, myName),
    [messagesHook, myName]
  );

  return {
    messages: messagesHook.messages,
    reactionsByMessage: reactionsHook.reactionsByMessage,
    receiptsByMessage: receiptsHook.receiptsByMessage,
    typing: typingHook.typing,
    presence: presenceHook.presence,
    loading: messagesHook.loading,
    myKind,
    myName,

    sendMessage,
    editMessage: messagesHook.editMessage,
    unsendMessage: messagesHook.unsendMessage,
    toggleReaction: reactionsHook.toggleReaction,
    isReactionInflight: reactionsHook.isInflight,
    markReadUpTo: receiptsHook.markReadUpTo,
    notifyTyping: typingHook.notifyTyping,
    retryFailed,
    removeFailed: messagesHook.removeFailed,
  };
}
