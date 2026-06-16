"use client";

import { memo, useCallback, useState, useEffect, useMemo } from "react";
import { getDeviceId } from "@/lib/auth/device";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  Calendar,
  BarChart3,
  StickyNote,
  Library,
  MessageSquarePlus,
  LifeBuoy,
  Settings,
  ShieldCheck,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { useForumUnread } from "@/hooks/use-forum-unread";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { UserProfilePopover } from "@/components/user/user-profile-popover";
import { useProfile } from "@/hooks/use-profile";
import { generateDefaultAvatar } from "@/lib/avatar";
import { AdminScopeSwitcher } from "@/components/admin/admin-scope-switcher";
import { sounds } from "@/lib/sounds";
import { useOptionalScope } from "@/components/providers/scope-provider";
import { useAdminPurchaseCount } from "@/hooks/use-admin-purchase-count";

interface SidebarProps {
  onSettingsOpen: () => void;
  onSupportOpen?: () => void;
  supportUnread?: number;
}

function buildNavItems(scopePath: string) {
  const base = `/${scopePath}`;
  return [
    { labelKey: "nav.dashboard", icon: Home, href: `${base}/dashboard` },
    { labelKey: "nav.subjects", icon: BookOpen, href: `${base}/subjects` },
    { labelKey: "nav.schedule", icon: Calendar, href: `${base}/jadwal` },
    { labelKey: "nav.analytics", icon: BarChart3, href: `${base}/analytics` },
    { labelKey: "nav.notes", icon: StickyNote, href: `${base}/notes` },
    { labelKey: "library.nav", icon: Library, href: `${base}/library` },
    { labelKey: "nav.feedback", icon: MessageSquarePlus, href: `${base}/feedback` },
  ];
}

const STORAGE_KEY = "hs-sidebar-collapsed";
const WIDTH_KEY = "hs-sidebar-width";
const MIN_W = 220;
const MAX_W = 420;
const DEFAULT_W = 256; // matches the old w-64

// Module-scope memoized NavButton - identity is stable across Sidebar renders
// (when inline-defined inside Sidebar, React treats it as a new component
// type each render and unmount/remounts every button).
const NavButton = memo(function NavButton({
  label,
  icon: Icon,
  href,
  isActive,
  onClick,
  onHrefClick,
  onHrefHover,
  collapsed,
}: {
  label: string;
  icon: typeof Home;
  href?: string;
  isActive?: boolean;
  onClick?: () => void;
  onHrefClick?: (href: string) => void;
  onHrefHover?: (href: string) => void;
  collapsed: boolean;
}) {
  const handleClick = () => {
    if (onClick) onClick();
    else if (href && onHrefClick) onHrefClick(href);
  };
  const handleHover = () => {
    if (href && onHrefHover) onHrefHover(href);
  };
  const btn = (
    <button
      onClick={handleClick}
      onMouseEnter={handleHover}
      onFocus={handleHover}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`hs-press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-sidebar-accent text-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span>{label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="w-full" />}>{btn}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return btn;
});

export function Sidebar({ onSettingsOpen, onSupportOpen, supportUnread = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useSession();
  const { profile } = useProfile();
  const { t } = useTranslation();
  const avatarSrc =
    profile.avatarUrl || generateDefaultAvatar(session?.name || "?", 64);
  const { notifications } = useNotifications();
  const { totalUnread: forumUnread } = useForumUnread(notifications);
  const scopeCtx = useOptionalScope();
  const scopePath = scopeCtx?.scopePath ?? "s2/uts/bm";
  const navItems = useMemo(() => buildNavItems(scopePath), [scopePath]);
  const dashboardHref = `/${scopePath}/dashboard`;
  const subjectsHref = `/${scopePath}/subjects`;
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_W);
  const [dragging, setDragging] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const { pendingCount: purchasePending } = useAdminPurchaseCount();
  const adminBadge = feedbackCount + purchasePending;

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  // Load persisted sidebar width.
  useEffect(() => {
    try {
      const w = parseInt(localStorage.getItem(WIDTH_KEY) || "", 10);
      if (w >= MIN_W && w <= MAX_W) setWidth(w);
    } catch {}
  }, []);

  // Drag-to-resize from the right edge (desktop). Width persists locally.
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      const startX = e.clientX;
      const startW = width;
      let latest = startW;
      const onMove = (ev: PointerEvent) => {
        latest = Math.min(MAX_W, Math.max(MIN_W, startW + (ev.clientX - startX)));
        setWidth(latest);
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        try {
          localStorage.setItem(WIDTH_KEY, String(latest));
        } catch {}
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [width]
  );

  // Fetch unread feedback count for admin
  useEffect(() => {
    if (!session?.isAdmin) return;
    fetch("/api/feedback?countUnread=true")
      .then((r) => r.json())
      .then((data) => setFeedbackCount(data.unreadCount || 0))
      .catch(() => {});
  }, [session?.isAdmin]);

  const toggleCollapsed = useCallback(() => {
    sounds.toggle();
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    sounds.leave();
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
    // Use full page navigation to ensure clean state (not client-side router)
    window.location.href = "/";
  }, [session, logout]);

  const onHrefClick = useCallback(
    (href: string) => {
      sounds.click();
      router.push(href);
    },
    [router]
  );
  const onHrefHover = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  return (
    <aside
      data-onboarding="sidebar"
      style={collapsed ? undefined : { width }}
      className={`hidden sm:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-[100dvh] sticky top-0 ${
        dragging ? "" : "transition-[width] duration-200"
      } ${collapsed ? "w-16" : ""}`}
    >
      {/* Resize handle (desktop, expanded only) */}
      {!collapsed && (
        <div
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label="Ubah lebar sidebar"
          className="absolute right-0 top-0 z-20 h-full w-1.5 cursor-col-resize touch-none select-none transition-colors hover:bg-primary/30 active:bg-primary/50"
        />
      )}

      {/* Logo + collapse toggle */}
      <div
        className={`flex items-center border-b border-sidebar-border ${
          collapsed ? "justify-center px-2 py-5" : "justify-between px-6 py-5"
        }`}
      >
        {!collapsed && (
          <button
            onClick={() => { sounds.click(); router.push(dashboardHref); }}
            className="font-heading text-xl font-extrabold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-primary">hai</span>
            <span className="text-sidebar-foreground">study</span>
          </button>
        )}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed}
          className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const isActive =
            item.href === dashboardHref
              ? pathname === dashboardHref
              : item.href === subjectsHref
                ? pathname.startsWith(`/${scopePath}/subject`)
                : item.href.startsWith("/")
                  ? pathname.startsWith(item.href.replace("#", ""))
                  : false;

          const showDot = item.labelKey === "nav.subjects" && forumUnread > 0;
          return (
            <div key={item.labelKey} className="relative">
              <NavButton
                label={t(item.labelKey)}
                icon={item.icon}
                href={item.href}
                isActive={isActive}
                onHrefClick={onHrefClick}
                onHrefHover={onHrefHover}
                collapsed={collapsed}
              />
              {showDot && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-destructive pointer-events-none" />
              )}
            </div>
          );
        })}

        {/* Support */}
        <div className="relative">
          <NavButton
            label={t("nav.support")}
            icon={LifeBuoy}
            onClick={onSupportOpen}
            collapsed={collapsed}
          />
          {supportUnread > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white pointer-events-none">
              {supportUnread > 9 ? "9+" : supportUnread}
            </span>
          )}
        </div>

        {/* Settings */}
        <div data-onboarding="settings">
          <NavButton
            label={t("nav.settings")}
            icon={Settings}
            onClick={onSettingsOpen}
            collapsed={collapsed}
          />
        </div>

        {/* Admin */}
        {session?.isAdmin && (
          <div className="relative">
            <NavButton
              label={t("nav.admin")}
              icon={ShieldCheck}
              href="/admin"
              isActive={pathname === "/admin" || pathname?.startsWith("/admin")}
              onHrefClick={onHrefClick}
              onHrefHover={onHrefHover}
              collapsed={collapsed}
            />
            {adminBadge > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white pointer-events-none">
                {adminBadge > 9 ? "9+" : adminBadge}
              </span>
            )}
          </div>
        )}

        {/* Admin scope switcher (below Admin) */}
        {session?.isAdmin && (
          <AdminScopeSwitcher collapsed={collapsed} />
        )}
      </nav>

      {/* Bottom section */}
      <div
        className={`border-t border-sidebar-border p-3 space-y-2 ${
          collapsed ? "px-2" : "p-4"
        }`}
      >
        {/* User info (clickable → profile popover) */}
        {!collapsed ? (
          <UserProfilePopover>
            <button className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
              <Image
                src={avatarSrc}
                alt={session?.name || ""}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-sidebar-border"
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{session?.shortName}</p>
                {session?.selectedClass && (
                  <p className="text-xs text-muted-foreground">
                    {session.selectedClass}
                  </p>
                )}
              </div>
            </button>
          </UserProfilePopover>
        ) : (
          <UserProfilePopover>
            <button
              aria-label={session?.shortName ? `Profil ${session.shortName}` : "Profil pengguna"}
              className="flex w-full justify-center rounded-lg py-1.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer"
            >
              <Image
                src={avatarSrc}
                alt={session?.name || ""}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 rounded-full object-cover ring-1 ring-sidebar-border"
              />
            </button>
          </UserProfilePopover>
        )}

        {/* Logout */}
        <NavButton label={t("nav.logout")} icon={LogOut} onClick={handleLogout} collapsed={collapsed} />
      </div>
    </aside>
  );
}
