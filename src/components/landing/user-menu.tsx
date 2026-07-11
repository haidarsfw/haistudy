"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, User, LogOut } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const TIER: Record<string, string> = {
  share: "Share",
  normal: "Normal",
  vip: "VIP",
  diamond: "Diamond",
};

// Logged-in header control: avatar + name → dropdown (Dashboard / Profil /
// Keluar). Profil (Account Settings page) and Keluar (logout wiring) are
// deferred per the plan — they render but are placeholders for now.
export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { session } = useSession();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!session) return null;
  const name = session.shortName || session.name || "Akun";
  const initial = name.charAt(0).toUpperCase();
  const tier = TIER[session.packageTier] ?? "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="brand-gradient-bg flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white">
          {initial}
        </span>
        {!compact && (
          <span className="max-w-[110px] truncate text-sm font-semibold text-foreground">
            {name}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {tier && (
              <p className="truncate text-xs text-muted-foreground">Paket {tier}</p>
            )}
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <LayoutDashboard className="h-4 w-4 text-primary" />
            {t("landing.cta.dashboard")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <User className="h-4 w-4 text-primary" />
            {t("landing.menu.profil")}
            <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t("landing.soon")}
            </span>
          </button>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {t("landing.menu.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
