"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, Loader2, User, LogOut } from "lucide-react";

import { useSession } from "@/components/providers/session-provider";
import { useTranslation } from "@/components/providers/language-provider";
import { useAccount } from "@/hooks/use-account";
import { cn } from "@/lib/utils";

const TIER: Record<string, string> = {
  share: "Share",
  normal: "Normal",
  vip: "VIP",
  diamond: "Diamond",
};

/**
 * The signed-in control in the landing header.
 *
 * Reads BOTH layers. `useSession` knows about an open access (a license) and
 * `useAccount` knows about the identity behind it, and the two do not always
 * agree: someone who has registered but never bought has an account and no
 * session at all. Keying only on the session, as this used to, meant a brand
 * new account still saw a "Masuk" button on the page it had just signed into.
 *
 * Profil and Keluar were placeholders that did nothing. Both are real now.
 */
export function UserMenu() {
  const { session } = useSession();
  const { account, access } = useAccount();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  const signedIn = Boolean(account) || Boolean(session && !session.isPreview);
  if (!signedIn) return null;

  // Never the email's local part. "akunfotoalkhalifah" is not a name, and
  // showing it turned the header into a truncated address and the account page
  // greeting into nonsense. Someone who has not filled in their name yet gets
  // no name here, not a guess at one.
  const name =
    session?.shortName || account?.nickname || session?.name || account?.fullName || "";
  const initial = (name || account?.email || "?").charAt(0).toUpperCase();
  const tier = session ? (TIER[session.packageTier] ?? "") : "";
  const dashboardPath = access?.dashboardPath ?? (session ? "/dashboard" : null);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/account/logout", { method: "POST" });
    } catch {
      /* cookies are cleared server-side; a failed call still ends here */
    }
    // Full navigation, not a router push: every provider holding session state
    // has to be torn down rather than re-rendered.
    window.location.href = "/";
  };

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
        {/* Avatar only. The name lives inside the dropdown, where it has room
            to be read — carrying it in the bar cost width the CTA needed. */}
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
            {name && <p className="truncate text-sm font-semibold text-foreground">{name}</p>}
            {account?.email && (
              <p className="truncate text-xs text-muted-foreground">{account.email}</p>
            )}
            {tier && <p className="truncate text-xs text-muted-foreground">Paket {tier}</p>}
          </div>
          <div className="my-1 h-px bg-border" />

          {dashboardPath && (
            <Link
              href={dashboardPath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <LayoutDashboard className="h-4 w-4 text-primary" />
              {t("landing.cta.dashboard")}
            </Link>
          )}

          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <User className="h-4 w-4 text-primary" />
            {t("landing.menu.profil")}
          </Link>

          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {t("landing.menu.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
