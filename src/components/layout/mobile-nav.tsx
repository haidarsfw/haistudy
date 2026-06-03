"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  BookOpen,
  Sparkles,
  MessageCircle,
  MoreHorizontal,
  Calendar,
  BarChart3,
  StickyNote,
  Library,
  MessageSquarePlus,
  HeadphonesIcon,
  Settings,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { useHideOnScroll } from "@/hooks/use-hide-on-scroll";
import { useAdminPurchaseCount } from "@/hooks/use-admin-purchase-count";
import { getDeviceId } from "@/lib/auth/device";
import { sounds } from "@/lib/sounds";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { MobileScopeSwitcher } from "@/components/admin/admin-scope-switcher";

interface MobileNavProps {
  onChatToggle?: () => void;
  isChatOpen?: boolean;
  onAiToggle?: () => void;
  isAiOpen?: boolean;
  onSupportOpen?: () => void;
  onSettingsOpen?: () => void;
  chatUnread?: number;
  supportUnread?: number;
}

export function MobileNav({
  onChatToggle,
  isChatOpen,
  onAiToggle,
  isAiOpen,
  onSupportOpen,
  onSettingsOpen,
  chatUnread = 0,
  supportUnread = 0,
}: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useSession();
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();
  const { pendingCount: purchasePending } = useAdminPurchaseCount();
  const navHidden = useHideOnScroll();
  const scopeCtx = useOptionalScope();
  const scopePath = scopeCtx?.scopePath ?? "s2/uts/bm";
  const base = `/${scopePath}`;
  const dashboardHref = `${base}/dashboard`;
  const [moreOpen, setMoreOpen] = useState(false);

  const mainItems = useMemo(
    () => [
      { labelKey: "mobile_nav.home", icon: Home, href: dashboardHref },
      { labelKey: "mobile_nav.subjects", icon: BookOpen, href: `${base}/subjects` },
      { labelKey: "mobile_nav.ai", icon: Sparkles, href: "#ai" },
      { labelKey: "mobile_nav.chat", icon: MessageCircle, href: "#chat" },
      { labelKey: "mobile_nav.more", icon: MoreHorizontal, href: "#more" },
    ],
    [dashboardHref, base]
  );

  const moreItems = useMemo(
    () => [
      { labelKey: "nav.schedule", icon: Calendar, href: `${base}/jadwal` },
      { labelKey: "nav.analytics", icon: BarChart3, href: `${base}/analytics` },
      { labelKey: "nav.notes", icon: StickyNote, href: `${base}/notes` },
      { labelKey: "library.nav", icon: Library, href: `${base}/library` },
      { labelKey: "nav.feedback", icon: MessageSquarePlus, href: `${base}/feedback` },
      { labelKey: "nav.support", icon: HeadphonesIcon, href: "#support" },
      { labelKey: "nav.settings", icon: Settings, href: "#settings" },
      ...(session?.isAdmin
        ? [{ labelKey: "nav.admin", icon: ShieldCheck, href: "/admin" }]
        : []),
    ],
    [base, session?.isAdmin]
  );

  // Prefetch nav routes on mount so taps don't wait for chunk download.
  // Touch devices have no hover signal, so prefetch eagerly.
  useEffect(() => {
    const hrefs = [
      dashboardHref,
      `${base}/subjects`,
      `${base}/jadwal`,
      `${base}/analytics`,
      `${base}/notes`,
      `${base}/library`,
      `${base}/feedback`,
      ...(session?.isAdmin ? ["/admin"] : []),
    ];
    hrefs.forEach((href) => router.prefetch(href));
  }, [base, dashboardHref, session?.isAdmin, router]);

  const handleMainNav = (href: string) => {
    sounds.click();
    // Subtle tactile feedback on supporting devices (Android/Chrome). iOS
    // ignores the Vibration API silently, so this is a no-op there.
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    if (href === "#chat") {
      onChatToggle?.();
      return;
    }
    if (href === "#ai") {
      onAiToggle?.();
      return;
    }
    if (href === "#more") {
      setMoreOpen((p) => !p);
      return;
    }
    router.push(href);
  };

  const handleMoreNav = (href: string) => {
    sounds.click();
    setMoreOpen(false);
    if (href === "#support") {
      onSupportOpen?.();
      return;
    }
    if (href === "#settings") {
      onSettingsOpen?.();
      return;
    }
    router.push(href);
  };

  const handleLogout = async () => {
    sounds.click();
    setMoreOpen(false);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: session?.licenseKey, deviceId: getDeviceId() }),
      });
    } catch {
      // Continue anyway
    }
    logout();
    router.push("/");
  };

  const isActive = (href: string) => {
    if (href === "#chat") return isChatOpen;
    if (href === "#more") return moreOpen;
    if (href === dashboardHref) return pathname === dashboardHref;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Bottom sheet overlay + menu */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 sm:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) setMoreOpen(false);
              }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-3xl border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+1rem)] max-h-[70vh] overflow-y-auto shadow-[0_-8px_30px_rgb(0_0_0/0.12)] dark:shadow-[0_-8px_30px_rgb(0_0_0/0.5)] sm:hidden"
            >
              {/* Grab handle */}
              <div className="sticky top-0 flex justify-center bg-background pt-2.5 pb-1">
                <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
              </div>

              {/* Current scope + admin switcher (collapsed by default) */}
              <MobileScopeSwitcher />

              <div className="flex items-center justify-between px-4 pt-2 pb-2">
                <h3 className="text-sm font-semibold">{t("mobile_nav.more_title")}</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label="Tutup menu"
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="px-2 pb-2">
                {moreItems.map((item) => {
                  const active = typeof item.href === "string" && !item.href.startsWith("#") && pathname.startsWith(item.href);
                  return (
                    <button
                      key={item.labelKey}
                      onClick={() => handleMoreNav(item.href)}
                      className={`hs-press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="flex-1 text-left">{t(item.labelKey)}</span>
                      {item.labelKey === "nav.support" && supportUnread > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                          {supportUnread > 9 ? "9+" : supportUnread}
                        </span>
                      )}
                      {item.labelKey === "nav.admin" && purchasePending > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white">
                          {purchasePending > 9 ? "9+" : purchasePending}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Logout */}
                <div className="mt-1 border-t border-border pt-1">
                  <button
                    onClick={handleLogout}
                    className="hs-press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5 shrink-0" />
                    <span>{t("nav.logout")}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      {/* Floating dock — immersive bottom nav */}
      <motion.nav
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: navHidden ? 170 : 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        aria-label={t("mobile_nav.more_title")}
        className="fixed inset-x-0 bottom-0 z-40 sm:hidden"
      >
        <div className="relative mx-3 mb-[calc(env(safe-area-inset-bottom)+0.5rem)] grid h-16 grid-cols-5 items-stretch rounded-[1.75rem] border border-border/60 bg-background/80 shadow-[0_8px_30px_rgb(0_0_0/0.12)] backdrop-blur-xl dark:bg-background/70 dark:shadow-[0_8px_30px_rgb(0_0_0/0.55)]">
          {mainItems.map((item) => {
            // Center slot: elevated, protruding AI button (faux-notch).
            if (item.href === "#ai") {
              return (
                <div
                  key={item.labelKey}
                  className="relative flex h-full flex-col items-center justify-end pb-2.5"
                >
                  <button
                    onClick={() => handleMainNav(item.href)}
                    aria-label={t(item.labelKey)}
                    aria-current={isAiOpen ? "page" : undefined}
                    data-onboarding="ai-mobile"
                    className="hs-press absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-[38%] items-center justify-center"
                  >
                    {/* Opaque disc cuts the translucent bar → notch illusion */}
                    <span
                      className="absolute h-[3.75rem] w-[3.75rem] rounded-full bg-background"
                      aria-hidden="true"
                    />
                    {/* Soft primary halo — lets the smaller button pop a touch */}
                    <span
                      className="absolute h-12 w-12 rounded-full bg-primary/35 blur-md"
                      aria-hidden="true"
                    />
                    <motion.span
                      whileTap={{ scale: 0.9 }}
                      animate={{ scale: isAiOpen ? 1.05 : 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                      className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-2 ring-background ${
                        isAiOpen ? "hs-nav-fab-glow" : ""
                      }`}
                    >
                      <Sparkles className="h-5 w-5" aria-hidden="true" />
                    </motion.span>
                  </button>
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isAiOpen ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t(item.labelKey)}
                  </span>
                </div>
              );
            }

            // Side slots: icon + label with a sliding shared-layout pill.
            const active = isActive(item.href);
            const badgeCount =
              item.href === "#chat"
                ? chatUnread
                : item.href === "#more"
                  ? unreadCount + supportUnread + (session?.isAdmin ? purchasePending : 0)
                  : 0;
            const showRedDot = badgeCount > 0;
            return (
              <button
                key={item.labelKey}
                data-onboarding={item.href === "#chat" ? "chat-mobile" : undefined}
                onClick={() => handleMainNav(item.href)}
                aria-label={t(item.labelKey)}
                aria-current={active ? "page" : undefined}
                className="hs-press relative flex h-full flex-col items-center justify-center gap-0.5"
              >
                {active && (
                  <motion.span
                    layoutId="hs-nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-x-1.5 inset-y-2 rounded-2xl bg-primary/12"
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  className={`relative z-10 ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <AnimatePresence>
                    {showRedDot && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white"
                      >
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.span>
                <span
                  className={`relative z-10 text-[10px] transition-colors ${
                    active ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
}
