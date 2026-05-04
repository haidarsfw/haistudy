"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import { useActiveSupport } from "@/components/providers/active-support-provider";
import { useSupportMutes } from "@/hooks/use-support-mutes";
import { useDesktopNotification } from "@/hooks/use-desktop-notification";
import { sounds } from "@/lib/sounds";
import { setTitleBadge, getTitleBadge } from "@/lib/title-badge";

interface SupportRowPayload {
  id: string;
  license_key: string;
  content?: string | null;
  type?: string | null;
  is_admin: boolean;
  is_internal?: boolean | null;
  sender_name: string;
  author_license_key?: string | null;
  created_at: string;
  // ...other fields from rowToSupportMessage
}

const BC_NAME = "haistudy-notifs";

/**
 * Global support-message listener. Mounted once per session in the app/admin shells.
 *
 * Responsibilities:
 *  - Subscribe to support_messages INSERT events (admin: all conversations,
 *    user: own conversation only).
 *  - For each new message NOT from self, NOT muted, NOT in-active-thread:
 *    fire sonner toast + chime + bump tab badge.
 *  - Trigger desktop Notification API for backgrounded tabs (web push handles
 *    fully-closed case via service worker).
 *  - De-dup across multiple browser tabs of the same user via BroadcastChannel.
 *  - Listen to SW postMessage(`support:incoming`) to surface in-app effects when
 *    OS push arrives in a backgrounded but still-open tab.
 */
export function useSupportNotifier() {
  const { session } = useSession();
  const { activeConversationLk, isFocused } = useActiveSupport();
  const { isMuted } = useSupportMutes();
  const { notify } = useDesktopNotification();
  const router = useRouter();

  // Refs for stable access from callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const activeRef = useRef({ activeConversationLk, isFocused });
  activeRef.current = { activeConversationLk, isFocused };
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const seenIds = useRef<Set<string>>(new Set());

  // ────────── BroadcastChannel: dedup across same-user tabs ──────────
  const bcRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(BC_NAME);
    bcRef.current = bc;
    bc.onmessage = (e) => {
      const data = e.data as { type?: string; messageId?: string };
      if (data?.type === "seen" && data.messageId) {
        seenIds.current.add(data.messageId);
      }
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  const handleIncoming = (
    raw: SupportRowPayload,
    source: "realtime" | "sw"
  ) => {
    const sess = sessionRef.current;
    if (!sess) return;

    // 1) De-dup across realtime + SW + multi-tab
    if (seenIds.current.has(raw.id)) return;
    seenIds.current.add(raw.id);
    if (seenIds.current.size > 200) {
      // Trim memory periodically
      const arr = Array.from(seenIds.current);
      seenIds.current = new Set(arr.slice(arr.length - 100));
    }
    bcRef.current?.postMessage({ type: "seen", messageId: raw.id });

    // 2) Skip own messages
    if (
      raw.author_license_key === sess.licenseKey ||
      raw.sender_name === sess.name
    ) {
      return;
    }

    // 3) Determine recipient eligibility
    const conversationLk = raw.license_key;
    const isAdmin = sess.isAdmin;

    // Admin gets all support inserts BUT skip if message belongs to a conv
    // that's not theirs & they are not the receiver. For admin, all
    // user-sent messages are notifications. Admin-to-admin internal notes
    // also notify other admins.
    if (isAdmin) {
      // Skip messages an admin themselves sent (handled above) or messages
      // from another admin to a different conversation that aren't internal
      // notes — those are still relevant to all admins (multi-admin support).
      // Keep as notification.
    } else {
      // User: only notify on messages in OWN conversation, from admin, not internal
      if (conversationLk !== sess.licenseKey) return;
      if (!raw.is_admin) return;
      if (raw.is_internal) return;
    }

    // 4) Mute check
    if (isMutedRef.current(conversationLk)) return;

    // 5) Active suppression: if currently viewing this conversation AND focused, skip
    const { activeConversationLk: active, isFocused: focused } =
      activeRef.current;
    const isActive = active === conversationLk && focused;

    // Always update tab title badge if not active+focused
    if (!isActive) {
      setTitleBadge(getTitleBadge() + 1);
    }

    if (isActive) {
      // already looking at it — UI inline update is enough; no toast/sound
      return;
    }

    // 6) Sonner toast + chime
    const previewType = raw.type ?? "text";
    const previewBody =
      previewType === "image"
        ? "📷 Foto"
        : previewType === "audio"
        ? "🎤 Pesan suara"
        : (raw.content ?? "").slice(0, 100);
    const preview = previewBody;

    const deepLink = isAdmin
      ? `/admin?tab=7&lk=${conversationLk}`
      : "/support";

    sounds.notification();
    toast.message(
      isAdmin ? `${raw.sender_name}` : "Balasan support",
      {
        description: preview,
        duration: 6000,
        action: {
          label: "Buka",
          onClick: () => router.push(deepLink),
        },
      }
    );

    // 7) OS-level desktop notification for backgrounded tab (Notification API).
    //    SW push handles fully-closed; this is the in-window-but-hidden path.
    if (typeof document !== "undefined" && document.hidden) {
      notify({
        title: isAdmin
          ? `${raw.sender_name} (support)`
          : "Balasan support",
        body: preview,
        tag: `support:${conversationLk}`,
        onClick: () => {
          window.focus();
          router.push(deepLink);
        },
      });
    }

    // Mark source for telemetry — kept so test scripts can verify
    void source;
  };

  // ────────── Realtime subscription ──────────
  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    const supabase = createClient();
    if (!supabase) return;

    const channelName = session.isAdmin
      ? "support:notif:all"
      : `support:notif:${session.licenseKey}`;
    const filter = session.isAdmin
      ? undefined
      : `license_key=eq.${session.licenseKey}`;

    const channel = supabase.channel(channelName).on(
      "postgres_changes",
      filter
        ? {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter,
          }
        : {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
          },
      (payload) => {
        handleIncoming(payload.new as SupportRowPayload, "realtime");
      }
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // handleIncoming reads everything via refs — safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.licenseKey, session?.isAdmin]);

  // ────────── SW postMessage ──────────
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const handler = (event: MessageEvent) => {
      const data = event.data as
        | { type?: string; payload?: { data?: { messageId?: string; conversationLk?: string; kind?: string } } }
        | undefined;
      if (data?.type === "support:incoming" && data.payload) {
        const d = data.payload.data;
        if (!d?.messageId || !d?.conversationLk) return;
        // Reconstruct minimum row for handleIncoming dedup/badge logic
        handleIncoming(
          {
            id: d.messageId,
            license_key: d.conversationLk,
            content: "",
            is_admin: true,
            sender_name: "",
            created_at: new Date().toISOString(),
          },
          "sw"
        );
      }
      if (data?.type === "support:navigate" && typeof (data as { target?: string }).target === "string") {
        router.push((data as { target: string }).target);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
