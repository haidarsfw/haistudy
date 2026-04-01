"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Moon,
  Sun,
  Settings,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { PomodoroTimer } from "@/components/shared/pomodoro-timer";
import { MusicPlayer } from "@/components/layout/music-player";
import { SearchDialog } from "@/components/search/search-dialog";
import { sounds } from "@/lib/sounds";

interface HeaderProps {
  onSettingsOpen?: () => void;
  onVoiceToggle?: () => void;
  activeVoiceRoom?: { id: string; name: string } | null;
}

export function Header({ onSettingsOpen, onVoiceToggle, activeVoiceRoom }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
  const { t } = useTranslation();
  const { dark, toggleDark } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isHome = pathname === "/dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      {/* Left: Logo on mobile, back button on sub-pages */}
      {isHome ? (
        <h1 className="font-heading text-lg font-bold sm:hidden">
          <span className="text-primary">hai</span>study
        </h1>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Search (desktop: inline expand, mobile: icon trigger) */}
      <div data-onboarding="search" className="hidden sm:block relative">
        {searchOpen ? (
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex relative items-center pl-9 pr-4 py-1.5 rounded-lg bg-muted/50 text-sm w-64 border border-border text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
            <span className="flex-1 text-left">{t("header.search")}</span>
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 text-[10px]">
              ⌘K
            </kbd>
          </button>
        )}
      </div>
      <Button
        data-onboarding="search-mobile"
        variant="ghost"
        size="icon-sm"
        onClick={(e) => { e.stopPropagation(); setSearchOpen(true); }}
        className="sm:hidden text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: actions - Order: Voice → Pomodoro → Dark mode → Notifications (rightmost) */}
      <div className="flex items-center gap-1.5">
        {/* Voice rooms - glass styling (desktop hover-expand) */}
        <button
          data-onboarding="voice"
          onClick={() => onVoiceToggle?.()}
          className={`group hidden sm:flex items-center gap-1 rounded-full px-2.5 py-1.5 backdrop-blur-sm border transition-[background-color,border-color,color] cursor-pointer ${
            activeVoiceRoom
              ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400"
              : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30"
          }`}
        >
          <div className="relative">
            <Mic className="h-4 w-4 shrink-0" />
            {activeVoiceRoom && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
            )}
          </div>
          <span className={`whitespace-nowrap text-xs font-medium transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width,opacity] ${
            activeVoiceRoom
              ? "max-w-[120px] opacity-100"
              : "max-w-0 overflow-hidden opacity-0 group-hover:max-w-[120px] group-hover:opacity-100"
          }`}>
            {activeVoiceRoom ? activeVoiceRoom.name : t("header.voice")}
          </span>
        </button>
        {/* Voice - mobile */}
        <Button
          data-onboarding="voice-mobile"
          variant="ghost"
          size="icon-sm"
          onClick={() => onVoiceToggle?.()}
          className={`sm:hidden ${activeVoiceRoom ? "text-green-500" : "text-primary"}`}
        >
          <div className="relative">
            <Mic className="h-4 w-4" />
            {activeVoiceRoom && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
            )}
          </div>
        </Button>

        {/* Pomodoro timer */}
        <PomodoroTimer />

        {/* Music player */}
        <MusicPlayer />

        {/* Dark mode toggle - hover expand (desktop) */}
        <button
          onClick={() => { sounds.toggle(); toggleDark(); }}
          className="group hidden sm:flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-[background-color,color] cursor-pointer"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? "sun" : "moon"}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[max-width,opacity] group-hover:max-w-[80px] group-hover:opacity-100">
            {dark ? t("header.light") : t("header.dark")}
          </span>
        </button>
        {/* Dark mode - mobile */}
        <Button variant="ghost" size="icon-sm" onClick={() => { sounds.toggle(); toggleDark(); }} className="sm:hidden">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications - rightmost (desktop: hover-expand, mobile: icon) */}
        <div data-onboarding="notifications" className="hidden sm:block">
          <NotificationCenter hoverExpand />
        </div>
        <div className="sm:hidden">
          <NotificationCenter />
        </div>

        {/* Settings (mobile only - desktop uses sidebar) */}
        <Button
          data-onboarding="settings-mobile"
          variant="ghost"
          size="icon-sm"
          onClick={onSettingsOpen}
          className="sm:hidden"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile search: still uses the inline dropdown in a portal-like overlay */}
      <div className="sm:hidden">
        {searchOpen && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm p-4">
            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
          </div>
        )}
      </div>
    </header>
  );
}
