"use client";

/**
 * Backwards-compat shim. Existing callsites import { useSupportChat } and
 * receive { messages, loading, sendMessage }. Internally we delegate to the
 * v2 composite hook so legacy callers transparently get the new pipeline.
 */

import { useCallback } from "react";
import { useSession } from "@/components/providers/session-provider";
import { useSupportChatThread } from "@/hooks/use-support-chat-thread";
import type { SupportMessage } from "@/types";

export interface UseSupportChatLegacy {
  messages: SupportMessage[];
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
}

export function useSupportChat(): UseSupportChatLegacy {
  const { session } = useSession();
  const thread = useSupportChatThread({
    licenseKey: session?.licenseKey ?? null,
    mode: "user",
  });

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = (content || "").trim();
      if (!trimmed) return;
      // Legacy callers send "[image]URL\n..." raw - pass through; the
      // server normalizes it into proper type/media_url.
      const isImage = trimmed.startsWith("[image]");
      if (isImage) {
        const lines = trimmed.split("\n");
        const url = lines[0].slice(7);
        const caption = lines.slice(1).join("\n");
        await thread.sendMessage(caption, { type: "image", mediaUrl: url });
      } else {
        await thread.sendMessage(trimmed);
      }
    },
    [thread]
  );

  return {
    messages: thread.messages,
    loading: thread.loading,
    sendMessage,
  };
}
