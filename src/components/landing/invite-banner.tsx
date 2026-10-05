"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, X } from "@/components/ui/icons";
import { useAccount } from "@/hooks/use-account";

/**
 * "Kamu diajak oleh X" — shown only to someone who arrived on a partner link.
 *
 * Client-side on purpose. Reading the cookie on the server would make the home
 * page dynamic on every visit, which is a Vercel invocation for each of the
 * many visitors who have no cookie at all. Both values are written by
 * /undangan/[handle], so there is nothing to fetch and nothing to look up.
 *
 * It also carries the one thing the landing page otherwise lacks: a direct way
 * into sign-up. Everything else routes through pricing, which is a long way
 * round for someone who was just told "pakai link saya".
 */
/** Hidden for this browser session only. Never clears the cookie: the code
 *  still has to survive to the sign-up form. */
const DISMISS_KEY = "hs-invite-dismissed";

function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  try {
    const hit = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)).trim() : "";
  } catch {
    return "";
  }
}

export function InviteBanner() {
  // Nothing on the first paint: the cookie is unreadable during SSR, and
  // rendering the bar only to remove it would shift the hero under the reader.
  const [invite, setInvite] = useState<{ code: string; by: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Already shared by the landing header, from a module-level cache — asking
  // here costs no extra request.
  const { account, loading } = useAccount();

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // Storage unavailable — the bar simply stays dismissable per page load.
    }
    const code = readCookie("hs-ref");
    if (!code) return;
    setInvite({ code, by: readCookie("hs-ref-by") });
  }, []);

  // The landing header is `fixed top-0`, so a bar placed above it in the DOM is
  // simply covered by it. Rather than reach into that header's scroll
  // animation, publish this bar's height and let the header offset itself by
  // it. Zero when there is no invite, which is the normal case.
  // Whether the bar is actually on screen. The height effect below keys on
  // this, not on `invite`: the invite is known on mount while the account check
  // is often still loading, so keying on `invite` measured a bar that had not
  // rendered yet, cleared the offset, and never ran again when the bar did
  // appear, leaving the fixed header sitting on top of it.
  const shown = Boolean(invite) && !dismissed && !loading && !account;

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!shown || !el) {
      root.style.removeProperty("--hs-invite-h");
      return;
    }
    const apply = () => root.style.setProperty("--hs-invite-h", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--hs-invite-h");
    };
  }, [shown]);

  // The cookie lives 7 days so the code survives until they sign up, which
  // means the bar would otherwise greet them on every visit for a week — and
  // greet a SIGNED-IN person with an invitation they cannot use, sometimes
  // their own. Someone with an account has nothing left to accept.
  if (!shown || !invite) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-0 z-[60] border-b border-primary/20 bg-primary/10 backdrop-blur"
    >
      <div className="relative mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-9 py-2.5 text-center text-xs sm:text-sm">
        <span className="flex items-center gap-1.5 text-primary">
          <Gift className="h-4 w-4 shrink-0" />
          {invite.by ? (
            <span>
              Kamu diajak oleh <strong className="font-semibold">{invite.by}</strong>.
            </span>
          ) : (
            <span>Kamu masuk lewat undangan teman.</span>
          )}
        </span>
        <span className="text-muted-foreground">
          Kodenya sudah terpasang, tinggal daftar.
        </span>
        <Link
          href="/register"
          className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 font-semibold text-primary transition-colors hover:bg-primary/25"
        >
          Daftar
        </Link>
        <button
          type="button"
          aria-label="Tutup"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Non-fatal: it just reappears on the next page load.
            }
          }}
          className="absolute right-2 top-1.5 rounded p-1 text-muted-foreground transition-colors hover:text-foreground sm:right-3 sm:top-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
