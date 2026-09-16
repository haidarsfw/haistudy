"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const code = readCookie("hs-ref");
    if (!code) return;
    setInvite({ code, by: readCookie("hs-ref-by") });
  }, []);

  // The landing header is `fixed top-0`, so a bar placed above it in the DOM is
  // simply covered by it. Rather than reach into that header's scroll
  // animation, publish this bar's height and let the header offset itself by
  // it. Zero when there is no invite, which is the normal case.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) {
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
  }, [invite]);

  if (!invite) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-0 z-[60] border-b border-primary/20 bg-primary/10 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-center text-xs sm:text-sm">
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
      </div>
    </div>
  );
}
