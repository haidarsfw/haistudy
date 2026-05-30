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
import { getDeviceId } from "@/lib/auth/device";
import { sounds } from "@/lib/sounds";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { MobileScopeSwitcher } from "@/components/admin/admin-scope-switcher";
import { jurusanLabel } from "@/lib/scope";

interface MobileNavProps {
  onChatToggle?: () => void;
  isChatOpen?: boolean;
  onAiToggle?: () => void;
  onSupportOpen?: () => void;
  onSettingsOpen?: () => void;
  chatUnread?: number;
  supportUnread?: number;
}

export function MobileNav({
  onChatToggle,
  isChatOpen,
  onAiToggle,
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
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl border-t border-border bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] max-h-[60vh] overflow-y-auto sm:hidden"
            >
              {/* Scope info header */}
              {scopeCtx && (
                <div className="mx-4 mt-4 mb-2 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">Scope Aktif</p>
                  <p className="text-sm font-medium text-foreground">
                    Semester {scopeCtx.scope.semester} · {scopeCtx.scope.examPeriod.toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">{jurusanLabel(scopeCtx.scope)}</p>
                </div>
              )}

              {/* Admin scope switcher */}
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


      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden">
        {mainItems.map((item) => {
          const active = isActive(item.href);
          const badgeCount = item.href === "#chat" ? chatUnread : item.href === "#more" ? (unreadCount + supportUnread) : 0;
          const showRedDot = badgeCount > 0;
          return (
            <button
              key={item.labelKey}
              data-onboarding={item.href === "#chat" ? "chat-mobile" : undefined}
              onClick={() => handleMainNav(item.href)}
              aria-label={t(item.labelKey)}
              aria-current={active ? "page" : undefined}
              className={`hs-press relative flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {showRedDot && (
                  <span className="absolute -right-1.5 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-destructive px-0.5 text-[8px] font-bold text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </div>
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
