"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useSession } from "@/components/providers/session-provider";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SessionTimeout } from "@/components/layout/session-timeout";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatTrigger } from "@/components/chat/chat-trigger";
import { AiChatPanel } from "@/components/ai/ai-chat-panel";
import { AiTrigger } from "@/components/ai/ai-trigger";
import { VoicePanel } from "@/components/voice/voice-panel";
import { useVoice } from "@/components/providers/voice-provider";
import { NotificationPopup } from "@/components/notifications/notification-popup";
import { SettingsModal } from "@/components/settings/settings-modal";
import { ReminderAlarm } from "@/components/shared/reminder-alarm";
import { OnboardingOverlay } from "@/components/onboarding/onboarding-overlay";
import { PreviewWatermark } from "@/components/shared/preview-watermark";
import { ClassSelector } from "@/components/auth/class-selector";
import { AnnouncementBanner } from "@/components/shared/announcement-banner";
import { AnnouncementModal } from "@/components/shared/announcement-modal";
import { SurveyPopup } from "@/components/shared/survey-popup";
import { SupportPanel } from "@/components/support/support-panel";
import { useNotifications } from "@/hooks/use-notifications";
import { useSettings } from "@/hooks/use-settings";
import { useProgressSync } from "@/hooks/use-progress-sync";
import { useVersionCheck } from "@/hooks/use-version-check";
import { usePresence } from "@/hooks/use-presence";
import type { Notification } from "@/types";
import { sounds } from "@/lib/sounds";
import { APP_EVENTS } from "@/lib/events";
import { useSupportUnread } from "@/hooks/use-support-unread";
import { ActiveSupportProvider } from "@/components/providers/active-support-provider";
import { SWRegister } from "@/components/notifications/sw-register";
import { EnableNotificationsBanner } from "@/components/notifications/enable-notifications-banner";
import { useSupportNotifier } from "@/hooks/use-support-notifier";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ActiveSupportProvider>
      <AppShellInner>{children}</AppShellInner>
    </ActiveSupportProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  // Mount once: registers /sw.js + listens for support inserts globally.
  useSupportNotifier();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { session, isLoading, updateSession } = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const { unreadCount: supportUnread, markAsRead: markSupportRead, markPanelClosed: markSupportClosed } = useSupportUnread();

  // Detect current subject from URL (e.g. /subject/statistik)
  const currentSubjectId = (params.id as string) || null;

  // Location key for presence — subject ID on /subject/[id], else top-level
  // path segment (e.g. "dashboard", "forum", "admin"). Admin sees this on
  // the online-users card to know what page each user is on.
  const currentLocationKey: string | null =
    currentSubjectId ||
    (pathname ? pathname.replace(/^\//, "").split("/")[0] || null : null);
  const [popupNotification, setPopupNotification] = useState<Notification | null>(null);
  const { notifications, dismissNotification } = useNotifications();
  const { settings, isLoading: settingsLoading } = useSettings();
  const voiceRoom = useVoice();

  // Sync study progress from server into localStorage for dashboard widgets
  useProgressSync();

  // Auto-reload when a new deploy is detected
  useVersionCheck();

  // Presence tracking — globally active on all app pages
  usePresence(currentLocationKey);

  // Lock body scroll when any overlay panel is open
  const anyPanelOpen = isChatOpen || isAiOpen || isVoiceOpen || isSupportOpen;
  useEffect(() => {
    if (anyPanelOpen) {
      document.documentElement.classList.add("panel-open");
    } else {
      document.documentElement.classList.remove("panel-open");
    }
    return () => { document.documentElement.classList.remove("panel-open"); };
  }, [anyPanelOpen]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/");
    }
  }, [isLoading, session, router]);

  // Sync selectedClass from settings to session (cross-device safety net)
  useEffect(() => {
    if (session && !session.selectedClass && settings?.selectedClass && !settingsLoading) {
      updateSession({ selectedClass: settings.selectedClass });
    }
  }, [session, settings?.selectedClass, settingsLoading, updateSession]);

  // Show popup for new unread notifications (dedup by ID, persisted via Supabase)
  const lastPopupId = useRef<string | null>(null);
  useEffect(() => {
    const unread = notifications.find(n => !n.read);
    if (unread && unread.id !== lastPopupId.current) {
      lastPopupId.current = unread.id;
      setPopupNotification(unread);
      sounds.notification();
    }
  }, [notifications]);

  // Global ESC handler — closes panels in priority order, then navigates back
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't interfere with input fields (search dialog has its own handler)
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (isSupportOpen) { setIsSupportOpen(false); return; }
      if (isVoiceOpen) { setIsVoiceOpen(false); return; }
      if (isAiOpen) { setIsAiOpen(false); return; }
      if (isChatOpen) { setIsChatOpen(false); return; }
      // Navigate to dashboard instead of router.back() to avoid escaping past app boundary
      const path = window.location.pathname;
      if (path && path !== "/dashboard") {
        router.push("/dashboard");
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSettingsOpen, isSupportOpen, isVoiceOpen, isAiOpen, isChatOpen, router]);

  // Listen for app events to open chat from notifications
  useEffect(() => {
    const handleOpenChat = () => {
      setIsChatOpen(true);
    };
    window.addEventListener(APP_EVENTS.OPEN_CHAT, handleOpenChat);
    return () => window.removeEventListener(APP_EVENTS.OPEN_CHAT, handleOpenChat);
  }, []);

  const handleChatToggle = useCallback(() => {
    setIsChatOpen((prev) => !prev);
  }, []);

  const handleChatClose = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const handleChatUnreadChange = useCallback((count: number) => {
    setChatUnread(count);
  }, []);

  const handleAiToggle = useCallback(() => {
    setIsAiOpen((prev) => !prev);
  }, []);

  const handleAiClose = useCallback(() => {
    setIsAiOpen(false);
  }, []);

  const handleVoiceToggle = useCallback(() => {
    setIsVoiceOpen((prev) => !prev);
  }, []);

  const handleVoiceClose = useCallback(() => {
    setIsVoiceOpen(false);
  }, []);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-heading text-2xl font-bold animate-shimmer bg-gradient-to-r from-primary via-primary/60 to-primary bg-[length:200%_auto] bg-clip-text text-transparent">
            <span>hai</span>study
          </h1>
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Enforce class selection before any feature access
  if (!session.selectedClass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ClassSelector
            selected={session.selectedClass}
            onSelect={async (cls) => {
              try {
                await fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    licenseKey: session.licenseKey,
                    settings: { selectedClass: cls },
                  }),
                });
              } catch {}
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-[100dvh] bg-background overflow-x-clip max-w-[100vw]">
      <PreviewWatermark />
      <Sidebar onSettingsOpen={handleSettingsOpen} supportUnread={supportUnread} onSupportOpen={() => {
        if (session?.isAdmin) { router.push("/admin?tab=7"); } else { markSupportRead(); setIsSupportOpen(true); }
      }} />

      {/* Main content area */}
      <div className="flex h-[100dvh] flex-1 flex-col min-w-0">
        <Header onSettingsOpen={handleSettingsOpen} onVoiceToggle={handleVoiceToggle} activeVoiceRoom={voiceRoom.activeRoom ? { id: voiceRoom.activeRoom.id, name: voiceRoom.activeRoom.name } : null} />
        <AnnouncementBanner />
        <EnableNotificationsBanner />
        <SessionTimeout />
        <SWRegister />
        <main className="flex-1 overflow-y-auto overflow-x-clip pb-14 sm:pb-0">{children}</main>
      </div>

      <MobileNav
        onChatToggle={handleChatToggle}
        isChatOpen={isChatOpen}
        onAiToggle={handleAiToggle}
        supportUnread={supportUnread}
        onSupportOpen={() => {
          if (session?.isAdmin) { router.push("/admin?tab=7"); } else { markSupportRead(); setIsSupportOpen(true); }
        }}
        onSettingsOpen={handleSettingsOpen}
        chatUnread={chatUnread}
      />

      {/* FABs (hidden on mobile - mobile uses bottom nav) */}
      <div className="hidden sm:block">
        <AiTrigger onClick={handleAiToggle} />
        <ChatTrigger onClick={handleChatToggle} unreadCount={chatUnread} />
      </div>

      {/* Chat panel */}
      <ChatPanel
        isOpen={isChatOpen}
        onClose={handleChatClose}
        onUnreadChange={handleChatUnreadChange}
      />

      {/* AI chat panel */}
      <AiChatPanel
        isOpen={isAiOpen}
        onClose={handleAiClose}
        subjectId={currentSubjectId}
      />

      {/* Voice panel */}
      <VoicePanel
        isOpen={isVoiceOpen}
        onClose={handleVoiceClose}
        rooms={voiceRoom.rooms}
        activeRoom={voiceRoom.activeRoom}
        loading={voiceRoom.loading}
        joining={voiceRoom.joining}
        isMuted={voiceRoom.isMuted}
        isLiveKitConfigured={voiceRoom.isLiveKitConfigured}
        livekitToken={voiceRoom.livekitToken}
        livekitUrl={voiceRoom.livekitUrl}
        joinRoom={voiceRoom.joinRoom}
        leaveRoom={voiceRoom.leaveRoom}
        createRoom={voiceRoom.createRoom}
        toggleMute={voiceRoom.toggleMute}
        refreshRooms={voiceRoom.refreshRooms}
      />

      {/* Settings modal */}
      <SettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />

      {/* Reminder alarm */}
      <ReminderAlarm reminderTime={settings.reminder} />

      {/* Support panel */}
      <SupportPanel isOpen={isSupportOpen} onClose={() => { setIsSupportOpen(false); markSupportClosed(); }} />

      {/* Onboarding tutorial */}
      <OnboardingOverlay />
    </div>

    {/* Notification popup outside clipped flex container */}
    <NotificationPopup
      notification={popupNotification}
      onDismiss={() => {
        if (popupNotification) {
          dismissNotification(popupNotification.id);
        }
        setPopupNotification(null);
      }}
    />

    {/* One-shot announcement popup (per-user, localStorage-gated) */}
    <AnnouncementModal />

    {/* Per-session survey popup (sessionStorage-gated) */}
    <SurveyPopup />
    </>
  );
}
