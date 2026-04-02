"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BookOpen,
  Calendar,
  BarChart3,
  Bookmark,
  StickyNote,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserProfilePopover } from "@/components/user/user-profile-popover";
import { sounds } from "@/lib/sounds";

interface SidebarProps {
  onSettingsOpen: () => void;
  onSupportOpen?: () => void;
}

const navItems = [
  { labelKey: "nav.dashboard", icon: Home, href: "/dashboard" },
  { labelKey: "nav.subjects", icon: BookOpen, href: "/subjects" },
  { labelKey: "nav.schedule", icon: Calendar, href: "/jadwal-uts" },
  { labelKey: "nav.analytics", icon: BarChart3, href: "/analytics" },
  { labelKey: "nav.bookmarks", icon: Bookmark, href: "/bookmarks" },
  { labelKey: "nav.notes", icon: StickyNote, href: "/notes" },
  { labelKey: "nav.feedback", icon: MessageSquarePlus, href: "/feedback" },
];

const STORAGE_KEY = "hs-sidebar-collapsed";

export function Sidebar({ onSettingsOpen, onSupportOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useSession();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  // Fetch unread feedback count for admin
  useEffect(() => {
    if (!session?.isAdmin) return;
    fetch("/api/feedback?countUnread=true")
      .then((r) => r.json())
      .then((data) => setFeedbackCount(data.unreadCount || 0))
      .catch(() => {});
  }, [session?.isAdmin]);

  const toggleCollapsed = () => {
    sounds.toggle();
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    sounds.leave();
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: session?.licenseKey }),
      });
    } catch {
      // Continue anyway
    }
    logout();
    // Use full page navigation to ensure clean state (not client-side router)
    window.location.href = "/";
  };

  const NavButton = ({
    label,
    icon: Icon,
    href,
    isActive,
    onClick,
  }: {
    label: string;
    icon: typeof Home;
    href?: string;
    isActive?: boolean;
    onClick?: () => void;
  }) => {
    const btn = (
      <button
        onClick={() => {
          sounds.click();
          if (onClick) onClick();
          else if (href) router.push(href);
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          collapsed ? "justify-center" : ""
        } ${
          isActive
            ? "bg-sidebar-accent text-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
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
  };

  return (
    <aside
      data-onboarding="sidebar"
      className={`hidden sm:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar h-[100dvh] sticky top-0 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo + collapse toggle */}
      <div
        className={`flex items-center border-b border-sidebar-border ${
          collapsed ? "justify-center px-2 py-5" : "justify-between px-6 py-5"
        }`}
      >
        {!collapsed && (
          <button
            onClick={() => { sounds.click(); router.push("/dashboard"); }}
            className="font-heading text-xl font-extrabold tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-primary">hai</span>
            <span className="text-sidebar-foreground">study</span>
          </button>
        )}
        <button
          onClick={toggleCollapsed}
          className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === "/subjects"
                ? pathname.startsWith("/subject")
                : item.href.startsWith("/")
                  ? pathname.startsWith(item.href.replace("#", ""))
                  : false;

          return (
            <NavButton
              key={item.labelKey}
              label={t(item.labelKey)}
              icon={item.icon}
              href={item.href}
              isActive={isActive}
            />
          );
        })}

        {/* Support */}
        <NavButton
          label={t("nav.support")}
          icon={LifeBuoy}
          onClick={onSupportOpen}
        />

        {/* Settings */}
        <div data-onboarding="settings">
          <NavButton
            label={t("nav.settings")}
            icon={Settings}
            onClick={onSettingsOpen}
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
            />
            {feedbackCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-white pointer-events-none">
                {feedbackCount > 9 ? "9+" : feedbackCount}
              </span>
            )}
          </div>
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {session?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{session?.name}</p>
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
            <button className="flex w-full justify-center rounded-lg py-1.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {session?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            </button>
          </UserProfilePopover>
        )}

        {/* Logout */}
        <NavButton label={t("nav.logout")} icon={LogOut} onClick={handleLogout} />
      </div>
    </aside>
  );
}
